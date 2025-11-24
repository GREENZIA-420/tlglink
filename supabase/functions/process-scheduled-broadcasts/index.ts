import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramUser {
  telegram_id: number;
  is_banned: boolean;
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  message: string,
  mediaUrls?: string[],
  buttons?: any[]
) {
  const keyboard = buttons && buttons.length > 0
    ? {
        inline_keyboard: [
          buttons.map((btn) => ({
            text: btn.label,
            url: btn.external_url || btn.web_app_url,
          })),
        ],
      }
    : undefined;

  if (mediaUrls && mediaUrls.length > 0) {
    const media = mediaUrls.map((url, index) => ({
      type: url.match(/\.(mp4|mov|avi)$/i) ? 'video' : 'photo',
      media: url,
      caption: index === 0 ? message : undefined,
    }));

    await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        media,
      }),
    });

    if (keyboard) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '⬆️ Cliquez sur un bouton ci-dessus',
          reply_markup: keyboard,
        }),
      });
    }
  } else {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        reply_markup: keyboard,
      }),
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Processing scheduled broadcasts...')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const now = new Date().toISOString()

    // Get all pending broadcasts that should be sent now
    const { data: broadcasts, error: fetchError } = await supabase
      .from('scheduled_broadcasts')
      .select('*, bot_configs!inner(bot_token)')
      .eq('is_sent', false)
      .lte('scheduled_for', now)

    if (fetchError) {
      console.error('Error fetching broadcasts:', fetchError)
      throw fetchError
    }

    if (!broadcasts || broadcasts.length === 0) {
      console.log('No broadcasts to send')
      return new Response(
        JSON.stringify({ message: 'No broadcasts to send' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${broadcasts.length} broadcasts to send`)

    for (const broadcast of broadcasts) {
      try {
        console.log(`Processing broadcast ${broadcast.id}`)

        // Get all non-banned users for this bot
        const { data: users, error: usersError } = await supabase
          .from('telegram_users')
          .select('telegram_id, is_banned')
          .eq('bot_id', broadcast.bot_id)
          .eq('is_banned', false)

        if (usersError) {
          console.error('Error fetching users:', usersError)
          continue
        }

        if (!users || users.length === 0) {
          console.log('No users to send to')
          continue
        }

        // Get buttons if specified
        let buttons = []
        if (broadcast.button_ids && broadcast.button_ids.length > 0) {
          const { data: buttonData } = await supabase
            .from('bot_buttons')
            .select('*')
            .in('id', broadcast.button_ids)

          if (buttonData) {
            buttons = buttonData
          }
        }

        const botToken = broadcast.bot_configs.bot_token

        // Send to all users with delay
        let successCount = 0
        for (const user of users as TelegramUser[]) {
          try {
            await sendTelegramMessage(
              botToken,
              user.telegram_id,
              broadcast.message,
              broadcast.media_urls || undefined,
              buttons
            )
            successCount++
            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 50))
          } catch (error) {
            console.error(`Failed to send to user ${user.telegram_id}:`, error)
          }
        }

        // Mark as sent
        await supabase
          .from('scheduled_broadcasts')
          .update({
            is_sent: true,
            sent_at: new Date().toISOString(),
          })
          .eq('id', broadcast.id)

        console.log(`Broadcast ${broadcast.id} sent to ${successCount}/${users.length} users`)
      } catch (error) {
        console.error(`Error processing broadcast ${broadcast.id}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: broadcasts.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in process-scheduled-broadcasts:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
