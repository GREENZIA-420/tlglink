import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptToken } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
    last_name?: string;
    language_code?: string;
    is_bot?: boolean;
  };
  chat: {
    id: number;
    type: string;
  };
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendTelegramMessage(botToken: string, chatId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const body: any = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log('Telegram API response:', data);
  return data;
}

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

function generateCaptchaCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function recordUserInteraction(botId: string, message: TelegramMessage, req: Request) {
  const userId = message.from.id;
  const firstName = message.from.first_name;
  const username = message.from.username;
  const lastName = message.from.last_name;
  const languageCode = message.from.language_code;
  const isBot = message.from.is_bot || false;

  // Get IP and user agent from request headers
  // Extract only the first (real client) IP from x-forwarded-for chain
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ipAddress = forwardedFor 
    ? forwardedFor.split(',')[0].trim() 
    : (req.headers.get('x-real-ip') || 'unknown');
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  
  // Determine platform from user agent
  let platform = 'unknown';
  if (userAgent.includes('Android')) platform = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'iOS';
  else if (userAgent.includes('Windows')) platform = 'Windows';
  else if (userAgent.includes('Mac')) platform = 'macOS';
  else if (userAgent.includes('Linux')) platform = 'Linux';

  // Check if user already exists for this bot
  const { data: existingUser } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('telegram_id', userId)
    .eq('bot_id', botId)
    .maybeSingle();

  if (existingUser) {
    // Update existing user
    await supabase
      .from('telegram_users')
      .update({
        last_interaction_at: new Date().toISOString(),
        total_interactions: (existingUser.total_interactions || 0) + 1,
        first_name: firstName,
        last_name: lastName,
        username: username,
      })
      .eq('telegram_id', userId)
      .eq('bot_id', botId);
  } else {
    // Insert new user
    await supabase
      .from('telegram_users')
      .insert({
        telegram_id: userId,
        first_name: firstName,
        last_name: lastName,
        username: username,
        language_code: languageCode,
        is_bot: isBot,
        ip_address: ipAddress,
        user_agent: userAgent,
        platform: platform,
        bot_id: botId,
      });
  }
}

async function handleNewUser(botToken: string, botId: string, userId: number, firstName: string, chatId: number) {
  console.log(`New user detected: ${userId} - ${firstName}`);
  
  // Get message template from database for this bot
  const { data: settings } = await supabase
    .from('bot_settings')
    .select('value')
    .eq('key', 'captcha_message')
    .eq('bot_id', botId)
    .maybeSingle();

  const messageTemplate = settings?.value || 
    '👋 Bonjour <b>{name}</b>!\n\n' +
    '🔐 Pour vérifier votre identité, veuillez entrer ce code:\n\n' +
    '<code>{code}</code>\n\n' +
    '⏱ Ce code expire dans <b>2 minutes</b>.';
  
  // Generate CAPTCHA code
  const code = generateCaptchaCode();
  
  // Store in database
  const { error: insertError } = await supabase
    .from('captcha_codes')
    .insert({
      user_telegram_id: userId,
      code: code,
      bot_id: botId,
    });

  if (insertError) {
    console.error('Error storing CAPTCHA code:', insertError);
    await sendTelegramMessage(botToken, chatId, '❌ Une erreur est survenue. Veuillez réessayer.');
    return;
  }

  // Replace template variables and ensure proper line breaks
  const message = messageTemplate
    .replace('{name}', firstName)
    .replace('{code}', code)
    .replace(/\\n/g, '\n'); // Convert escaped newlines to actual newlines

  await sendTelegramMessage(botToken, chatId, message);
}

async function handleCaptchaValidation(botToken: string, botId: string, userId: number, text: string, chatId: number, firstName: string) {
  console.log(`Validating CAPTCHA for user ${userId}: ${text}`);
  
  // Find valid code for this bot
  const { data: codes, error: fetchError } = await supabase
    .from('captcha_codes')
    .select('*')
    .eq('user_telegram_id', userId)
    .eq('bot_id', botId)
    .eq('is_validated', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error('Error fetching CAPTCHA codes:', fetchError);
    await sendTelegramMessage(botToken, chatId, '❌ Une erreur est survenue.');
    return;
  }

  if (!codes || codes.length === 0) {
    await sendTelegramMessage(
      botToken,
      chatId, 
      '⏰ Votre code a expiré ou est invalide.\n\n' +
      'Envoyez /start pour recevoir un nouveau code.'
    );
    return;
  }

  const storedCode = codes[0];

  if (storedCode.code === text.trim()) {
    // Mark as validated
    await supabase
      .from('captcha_codes')
      .update({ is_validated: true })
      .eq('id', storedCode.id);

    // Get welcome message and image from database for this bot
    const { data: settings } = await supabase
      .from('bot_settings')
      .select('key, value')
      .eq('bot_id', botId)
      .in('key', ['welcome_message', 'welcome_image_url']);

    const welcomeMessageSetting = settings?.find(s => s.key === 'welcome_message');
    const welcomeImageSetting = settings?.find(s => s.key === 'welcome_image_url');

    const welcomeTemplate = welcomeMessageSetting?.value ||
      '✅ <b>Code validé avec succès!</b>\n\n' +
      '🎉 Bienvenue {name}!\n\n' +
      'Vous êtes maintenant vérifié et pouvez utiliser le bot.';

    const welcomeImageUrl = welcomeImageSetting?.value || '';

    // Replace template variables and ensure proper line breaks
    const welcomeMessage = welcomeTemplate
      .replace('{name}', firstName)
      .replace(/\\n/g, '\n'); // Convert escaped newlines to actual newlines

    // Get active buttons for this bot
    const { data: buttons } = await supabase
      .from('bot_buttons')
      .select('*')
      .eq('bot_id', botId)
      .eq('is_active', true)
      .order('position', { ascending: true });

    let inlineKeyboard: any[] = [];

    if (buttons && buttons.length > 0) {
      // Process buttons
      for (const button of buttons) {
        if (button.type === 'telegram_invite' && button.telegram_chat_id) {
          // Check if user already has a valid invite link
          const { data: existingLink } = await supabase
            .from('telegram_invite_links')
            .select('*')
            .eq('user_telegram_id', userId)
            .eq('button_id', button.id)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let inviteLink: string | null = null;

          if (existingLink) {
            inviteLink = existingLink.invite_link;
          } else {
            // Create new invite link
            inviteLink = await createChatInviteLink(botToken, button.telegram_chat_id, userId);
            
            if (inviteLink) {
              // Store the invite link
              await supabase
                .from('telegram_invite_links')
                .insert({
                  user_telegram_id: userId,
                  button_id: button.id,
                  invite_link: inviteLink,
                  expires_at: new Date(Date.now() + 120000).toISOString(), // 2 minutes
                  bot_id: botId,
                });
            }
          }

          if (inviteLink) {
            inlineKeyboard.push([{ text: button.label, url: inviteLink }]);
          }
        } else if (button.type === 'external_link' && button.external_url) {
          inlineKeyboard.push([{ text: button.label, url: button.external_url }]);
        } else if (button.type === 'miniapp' && button.web_app_url) {
          inlineKeyboard.push([{ text: button.label, web_app: { url: button.web_app_url } }]);
        }
      }
    }

    const replyMarkup = inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined;

    // Send image with caption and buttons if image exists
    if (welcomeImageUrl && welcomeImageUrl.trim() !== '') {
      console.log('Sending photo with URL:', welcomeImageUrl);
      console.log('Reply markup:', JSON.stringify(replyMarkup, null, 2));
      
      const imagePayload: any = {
        chat_id: chatId,
        photo: welcomeImageUrl,
        caption: welcomeMessage,
        parse_mode: 'HTML'
      };

      if (replyMarkup) {
        imagePayload.reply_markup = replyMarkup;
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imagePayload),
      });

      const responseData = await response.json();
      console.log('Telegram sendPhoto response:', JSON.stringify(responseData, null, 2));

      if (!response.ok || !responseData.ok) {
        console.error('Failed to send photo:', responseData);
        // Fallback to text message if photo fails
        await sendTelegramMessage(botToken, chatId, welcomeMessage, replyMarkup);
      }
    } else {
      console.log('No image URL, sending text message only');
      // Send text message if no image
      await sendTelegramMessage(botToken, chatId, welcomeMessage, replyMarkup);
    }
  } else {
    await sendTelegramMessage(
      botToken,
      chatId,
      '❌ Code incorrect. Veuillez réessayer ou envoyez /start pour un nouveau code.'
    );
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract bot_id from URL query parameters
    const url = new URL(req.url);
    const botId = url.searchParams.get('bot_id');

    if (!botId) {
      console.error('Missing bot_id parameter');
      return new Response(
        JSON.stringify({ error: 'Missing bot_id parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get bot config from database
    const { data: botConfig, error: configError } = await supabase
      .from('bot_configs')
      .select('*')
      .eq('id', botId)
      .maybeSingle();

    if (configError || !botConfig) {
      console.error('Bot config not found:', configError);
      return new Response(
        JSON.stringify({ error: 'Bot configuration not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const encryptedBotToken = botConfig.bot_token;
    
    // Decrypt the bot token
    let botToken: string;
    try {
      botToken = await decryptToken(encryptedBotToken);
    } catch (error) {
      // If decryption fails, assume it's an unencrypted token (backward compatibility)
      console.warn('Token decryption failed, assuming unencrypted token:', error);
      botToken = encryptedBotToken;
    }

    const update: TelegramUpdate = await req.json();
    console.log('Received update:', JSON.stringify(update, null, 2));

    const message = update.message;
    if (!message || !message.text) {
      return new Response('OK', { headers: corsHeaders });
    }

    const userId = message.from.id;
    const chatId = message.chat.id;
    const text = message.text;
    const firstName = message.from.first_name;

    // Record user interaction
    await recordUserInteraction(botId, message, req);

    // Check if user is banned
    const { data: userData, error: userError } = await supabase
      .from('telegram_users')
      .select('is_banned')
      .eq('telegram_id', userId)
      .eq('bot_id', botId)
      .maybeSingle();

    if (userData?.is_banned) {
      // Get banned message from settings or use default
      const { data: bannedMessageSetting } = await supabase
        .from('bot_settings')
        .select('value')
        .eq('key', 'banned_message')
        .eq('bot_id', botId)
        .maybeSingle();

      const bannedMessage = bannedMessageSetting?.value ||
        '🚫 <b>Accès refusé</b>\n\n' +
        'Vous avez été banni de ce bot et ne pouvez plus l\'utiliser.\n\n' +
        'Si vous pensez qu\'il s\'agit d\'une erreur, contactez l\'administrateur.';

      await sendTelegramMessage(botToken, chatId, bannedMessage);
      return new Response('OK', {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if it's /start command
    if (text === '/start') {
      await handleNewUser(botToken, botId, userId, firstName, chatId);
    } else {
      // Try to validate as CAPTCHA code
      await handleCaptchaValidation(botToken, botId, userId, text, chatId, firstName);
    }

    return new Response('OK', {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});