import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!

async function sendSMS(to: string, from: string, body: string) {
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString()
    }
  )
  const data = await response.json()
  return data
}

async function generateRiverSMS(
  callerNumber: string,
  businessName: string,
  industry: string
) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `You are River, the AI assistant for ${businessName}, a ${industry} business.
        
Someone just called and we missed their call. Write a friendly, professional SMS text-back message.

Rules:
- Under 160 characters
- Warm and professional
- Mention we saw their missed call
- Offer to help immediately
- Sign off as the business name
- No emojis
- Sound human not robotic

Return ONLY the SMS message text. Nothing else.`
      }]
    })
  })
  const data = await response.json()
  return data.content[0].text.trim()
}

async function findClientByNumber(toNumber: string) {
  const { data, error } = await supabase
    .from('integration_settings')
    .select('user_id, config')
    .eq('integration_name', 'twilio')
    .eq('status', 'connected')
  
  if (error || !data) return null

  for (const integration of data) {
    const config = integration.config as any
    if (config?.phone_number === toNumber) {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', integration.user_id)
        .single()
      return user
    }
  }
  return null
}

async function logActivity(
  userId: string,
  contactId: string | null,
  type: string,
  description: string
) {
  await supabase.from('activities').insert({
    user_id: userId,
    contact_id: contactId,
    type,
    description,
    created_at: new Date().toISOString()
  })
}

async function findOrCreateContact(
  userId: string,
  phoneNumber: string,
  callerName: string
) {
  const { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .eq('phone', phoneNumber)
    .single()

  if (existing) return existing

  const nameParts = callerName && callerName !== 'Unknown'
    ? callerName.split(' ')
    : ['Unknown', 'Caller']

  const { data: newContact } = await supabase
    .from('contacts')
    .insert({
      user_id: userId,
      first_name: nameParts[0] || 'Unknown',
      last_name: nameParts.slice(1).join(' ') || 'Caller',
      phone: phoneNumber,
      source: 'Inbound Call',
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  return newContact
}

async function postRiverAlert(
  userId: string,
  message: string,
  messageType: string
) {
  const { data: channel } = await supabase
    .from('channels')
    .select('id')
    .eq('name', 'river-alerts')
    .eq('created_by', userId)
    .single()

  if (!channel) return

  await supabase.from('messenger_messages').insert({
    channel_id: channel.id,
    sender_id: userId,
    content: message,
    message_type: messageType,
    created_at: new Date().toISOString()
  })
}

function handleInboundCall(businessName: string, vapiAssistantId: string) {
  if (vapiAssistantId) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://api.vapi.ai/twilio">
      <Parameter name="assistantId" value="${vapiAssistantId}"/>
    </Stream>
  </Connect>
</Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">
    Thank you for calling ${businessName}. 
    We are currently assisting other customers. 
    Please leave a brief message and we will call you back shortly.
  </Say>
  <Record maxLength="60" transcribeCallback="/functions/v1/twilio-transcribe"/>
</Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  )
}

serve(async (req) => {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const callStatus = params.get('CallStatus')
    const from = params.get('From') || ''
    const to = params.get('To') || ''
    const callerName = params.get('CallerName') || 'Unknown Caller'

    console.log(`Call event: ${callStatus} from ${from} to ${to}`)

    const client = await findClientByNumber(to)

    if (!client) {
      console.log(`No client found for number: ${to}`)
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const { data: twilioSettings } = await supabase
      .from('integration_settings')
      .select('config')
      .eq('user_id', client.user_id)
      .eq('integration_name', 'twilio')
      .single()

    const { data: vapiSettings } = await supabase
      .from('integration_settings')
      .select('config')
      .eq('user_id', client.user_id)
      .eq('integration_name', 'vapi')
      .single()

    const vapiAssistantId = (vapiSettings?.config as any)?.assistant_id || ''

    if (!callStatus || callStatus === 'ringing') {
      return handleInboundCall(
        client.business_name || 'our team',
        vapiAssistantId
      )
    }

    if (
      callStatus === 'no-answer' ||
      callStatus === 'busy' ||
      callStatus === 'failed'
    ) {
      const contact = await findOrCreateContact(client.user_id, from, callerName)

      const smsMessage = await generateRiverSMS(
        from,
        client.business_name || 'Our Business',
        client.industry || 'service business'
      )

      const twilioFrom = (twilioSettings?.config as any)?.phone_number || to
      await sendSMS(from, twilioFrom, smsMessage)

      await logActivity(
        client.user_id,
        contact?.id || null,
        'call',
        `Missed call from ${from} (${callerName}). River sent automatic text-back.`
      )

      await logActivity(
        client.user_id,
        contact?.id || null,
        'sms',
        `River text-back sent: "${smsMessage}"`
      )

      await postRiverAlert(
        client.user_id,
        `Missed call from ${callerName || from}. River sent text-back within 60 seconds: "${smsMessage}"`,
        'river_alert'
      )

      return new Response(
        JSON.stringify({ success: true, action: 'missed_call_textback_sent' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (callStatus === 'completed') {
      const callDuration = params.get('CallDuration') || '0'
      const contact = await findOrCreateContact(client.user_id, from, callerName)

      await logActivity(
        client.user_id,
        contact?.id || null,
        'call',
        `Inbound call completed. Duration: ${callDuration}s. Handled by River.`
      )

      await postRiverAlert(
        client.user_id,
        `Call completed with ${callerName || from}. Duration: ${callDuration} seconds. River handled the conversation.`,
        'river_alert'
      )

      return new Response(
        JSON.stringify({ success: true, action: 'call_completed_logged' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, action: 'webhook_received' }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Twilio webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
