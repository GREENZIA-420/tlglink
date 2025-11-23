import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BroadcastRequest {
  bot_id: string;
  message: string;
  media_urls?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Broadcast message function invoked');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { bot_id, message, media_urls = [] }: BroadcastRequest = await req.json();

    if (!bot_id || !message) {
      return new Response(
        JSON.stringify({ error: 'bot_id and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Broadcasting message for bot_id: ${bot_id}`);

    // Get bot config
    const { data: botConfig, error: botError } = await supabase
      .from('bot_configs')
      .select('bot_token')
      .eq('id', bot_id)
      .single();

    if (botError || !botConfig) {
      console.error('Bot config error:', botError);
      return new Response(
        JSON.stringify({ error: 'Bot configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botToken = botConfig.bot_token;

    // Get all users who interacted with this bot
    const { data: users, error: usersError } = await supabase
      .from('telegram_users')
      .select('telegram_id, first_name')
      .eq('bot_id', bot_id);

    if (usersError) {
      console.error('Users fetch error:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!users || users.length === 0) {
      console.log('No users found for this bot');
      return new Response(
        JSON.stringify({ sent_count: 0, message: 'No users found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${users.length} users to send message to`);

    // Determine media type
    const hasMedia = media_urls && media_urls.length > 0;
    const mediaType = hasMedia ? (media_urls[0].match(/\.(mp4|avi|mov|webm)$/i) ? 'video' : 'photo') : null;

    // Send message to each user
    let sentCount = 0;
    const errors = [];

    for (const user of users) {
      try {
        let response;

        if (!hasMedia) {
          // Text only message
          response = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: user.telegram_id,
                text: message,
                parse_mode: 'HTML',
              }),
            }
          );
        } else if (media_urls.length === 1) {
          // Single media with caption
          const mediaUrl = media_urls[0];
          const isVideo = mediaUrl.match(/\.(mp4|avi|mov|webm)$/i);
          
          const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
          const mediaField = isVideo ? 'video' : 'photo';
          
          response = await fetch(
            `https://api.telegram.org/bot${botToken}/${endpoint}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: user.telegram_id,
                [mediaField]: mediaUrl,
                caption: message,
                parse_mode: 'HTML',
              }),
            }
          );
        } else {
          // Multiple media - use sendMediaGroup
          const mediaGroup = media_urls.map((url, index) => {
            const isVideo = url.match(/\.(mp4|avi|mov|webm)$/i);
            return {
              type: isVideo ? 'video' : 'photo',
              media: url,
              // Add caption only to first media
              ...(index === 0 ? { caption: message, parse_mode: 'HTML' } : {})
            };
          });

          response = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMediaGroup`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: user.telegram_id,
                media: mediaGroup,
              }),
            }
          );
        }

        const result = await response.json();

        if (result.ok) {
          sentCount++;
          console.log(`Message sent to user ${user.telegram_id} (${user.first_name})`);
        } else {
          console.error(`Failed to send to ${user.telegram_id}:`, result.description);
          errors.push({ user_id: user.telegram_id, error: result.description });
        }
      } catch (error) {
        console.error(`Error sending to ${user.telegram_id}:`, error);
        errors.push({ user_id: user.telegram_id, error: String(error) });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`Broadcast complete: ${sentCount}/${users.length} messages sent`);

    return new Response(
      JSON.stringify({
        sent_count: sentCount,
        total_users: users.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Broadcast error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
