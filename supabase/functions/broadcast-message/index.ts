import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function createChatInviteLink(botToken: string, chatId: string, userId: number): Promise<string | null> {
  const url = `https://api.telegram.org/bot${botToken}/createChatInviteLink`;
  
  const expiresIn = Math.floor(Date.now() / 1000) + 120; // 2 minutes from now
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      expire_date: expiresIn,
      member_limit: 1,
    }),
  });

  const data = await response.json();
  
  if (!data.ok) {
    console.error('Error creating invite link:', data);
    return null;
  }

  return data.result.invite_link;
}

interface BroadcastRequest {
  bot_id: string;
  message: string;
  media_urls?: string[];
  button_ids?: string[];
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
    const { bot_id, message, media_urls = [], button_ids = [] }: BroadcastRequest = await req.json();

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

    // Get buttons if requested
    let replyMarkup = null;
    if (button_ids && button_ids.length > 0) {
      const { data: buttonsData, error: buttonsError } = await supabase
        .from('bot_buttons')
        .select('*')
        .in('id', button_ids)
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (!buttonsError && buttonsData && buttonsData.length > 0) {
        const inlineKeyboard = [];
        
        for (const button of buttonsData) {
          const buttonRow: any = { text: button.label };

          if (button.type === 'external_link' && button.external_url) {
            buttonRow.url = button.external_url;
            inlineKeyboard.push([buttonRow]);
          } else if (button.type === 'miniapp' && button.web_app_url) {
            buttonRow.web_app = { url: button.web_app_url };
            inlineKeyboard.push([buttonRow]);
          } else if (button.type === 'telegram_invite' && button.telegram_chat_id) {
            // For telegram invites, create ephemeral links per user
            // We'll handle this per user below
            continue;
          }
        }

        if (inlineKeyboard.length > 0) {
          replyMarkup = { inline_keyboard: inlineKeyboard };
        }
      }
    }

    // Determine media type
    const hasMedia = media_urls && media_urls.length > 0;
    const mediaType = hasMedia ? (media_urls[0].match(/\.(mp4|avi|mov|webm)$/i) ? 'video' : 'photo') : null;

    // Send message to each user
    let sentCount = 0;
    const errors = [];

    for (const user of users) {
      try {
        // Create user-specific reply markup for telegram invite buttons
        let userReplyMarkup = replyMarkup ? JSON.parse(JSON.stringify(replyMarkup)) : { inline_keyboard: [] };
        
        // Handle telegram invite buttons
        if (button_ids && button_ids.length > 0) {
          const { data: inviteButtons } = await supabase
            .from('bot_buttons')
            .select('*')
            .in('id', button_ids)
            .eq('type', 'telegram_invite')
            .eq('is_active', true);

          if (inviteButtons && inviteButtons.length > 0) {
            for (const button of inviteButtons) {
              if (!button.telegram_chat_id) continue;

              // Create ephemeral invite link
              const inviteLink = await createChatInviteLink(botToken, button.telegram_chat_id, user.telegram_id);
              
              if (inviteLink) {
                // Store invite link in database
                const expiresAt = new Date(Date.now() + 120000).toISOString();
                await supabase
                  .from('telegram_invite_links')
                  .insert({
                    user_telegram_id: user.telegram_id,
                    button_id: button.id,
                    invite_link: inviteLink,
                    expires_at: expiresAt,
                    bot_id: bot_id,
                  });

                userReplyMarkup.inline_keyboard.push([{
                  text: button.label,
                  url: inviteLink
                }]);
              }
            }
          }
        }

        const finalReplyMarkup = userReplyMarkup.inline_keyboard.length > 0 ? userReplyMarkup : null;

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
                ...(finalReplyMarkup ? { reply_markup: finalReplyMarkup } : {})
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
                ...(finalReplyMarkup ? { reply_markup: finalReplyMarkup } : {})
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

          // If we have buttons with media group, send them in a separate message
          if (finalReplyMarkup) {
            await fetch(
              `https://api.telegram.org/bot${botToken}/sendMessage`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: user.telegram_id,
                  text: '👇 Actions disponibles:',
                  reply_markup: finalReplyMarkup
                }),
              }
            );
          }
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
