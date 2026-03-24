import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') || ''
const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || ''
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || ''
const SENDGRID_KEY = Deno.env.get('SENDGRID_API_KEY') || ''
const VAPI_KEY = Deno.env.get('VAPI_API_KEY') || ''

// ─────────────────────────────────────────
// STEP EXECUTORS
// ─────────────────────────────────────────

async function executeSendSMS(step: any, contact: any, userIntegrations: any) {
  try {
    const twilioSid = userIntegrations?.twilio?.account_sid || TWILIO_SID
    const twilioToken = userIntegrations?.twilio?.auth_token || TWILIO_TOKEN
    const fromNumber = userIntegrations?.twilio?.phone_number

    if (!fromNumber) {
      return { success: false, error: 'No Twilio phone number configured' }
    }

    let message = step.config?.message || ''
    message = message
      .replace('{first_name}', contact.first_name || '')
      .replace('{last_name}', contact.last_name || '')
      .replace('{business_name}', contact.business_name || '')
      .replace('{phone}', contact.phone || '')

    const credentials = btoa(`${twilioSid}:${twilioToken}`)
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: contact.phone,
          From: fromNumber,
          Body: message
        }).toString()
      }
    )

    const result = await response.json()
    return { success: response.ok, message_sid: result.sid, error: result.message }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function executeSendEmail(step: any, contact: any, userIntegrations: any) {
  try {
    const sendgridKey = userIntegrations?.sendgrid?.api_key || SENDGRID_KEY
    const fromEmail = userIntegrations?.sendgrid?.from_email
    const fromName = userIntegrations?.sendgrid?.from_name || 'River AI'

    if (!fromEmail) {
      return { success: false, error: 'No SendGrid from email configured' }
    }

    let subject = step.config?.subject || 'Message from River'
    let body = step.config?.body || ''

    subject = subject
      .replace('{first_name}', contact.first_name || '')
      .replace('{business_name}', contact.business_name || '')
    body = body
      .replace('{first_name}', contact.first_name || '')
      .replace('{last_name}', contact.last_name || '')
      .replace('{business_name}', contact.business_name || '')

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: contact.email, name: `${contact.first_name} ${contact.last_name}` }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [{ type: 'text/plain', value: body }]
      })
    })

    return { success: response.ok || response.status === 202, status: response.status }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function executeVapiCall(step: any, contact: any, userIntegrations: any) {
  try {
    const vapiKey = userIntegrations?.vapi?.api_key || VAPI_KEY
    const assistantId = userIntegrations?.vapi?.active_assistant_id
    const phoneNumberId = userIntegrations?.vapi?.phone_number_id

    if (!assistantId || !phoneNumberId) {
      return { success: false, error: 'Vapi assistant or phone number not configured' }
    }
    if (!contact.phone) {
      return { success: false, error: 'Contact has no phone number' }
    }

    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId,
        phoneNumberId,
        customer: {
          number: contact.phone,
          name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
        },
        assistantOverrides: step.config?.script
          ? { firstMessage: step.config.script.replace('{first_name}', contact.first_name || 'there').replace('{business_name}', contact.business_name || '') }
          : undefined
      })
    })

    const result = await response.json()
    return { success: response.ok, call_id: result.id, error: result.message }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function executeWait(step: any) {
  const duration = step.config?.duration || 1
  const unit = step.config?.unit || 'hours'

  let ms = duration * 1000
  if (unit === 'minutes') ms = duration * 60 * 1000
  if (unit === 'hours') ms = duration * 60 * 60 * 1000
  if (unit === 'days') ms = duration * 24 * 60 * 60 * 1000

  return { success: true, wait_until: new Date(Date.now() + ms).toISOString() }
}

async function executeUpdateContact(step: any, contact: any, userId: string) {
  try {
    const updates: any = {}
    if (step.config?.status) updates.status = step.config.status
    updates.updated_at = new Date().toISOString()

    await supabase.from('contacts').update(updates).eq('id', contact.id).eq('user_id', userId)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function executeCondition(step: any, contact: any, executionContext: any) {
  const conditionType = step.config?.condition_type
  const value = step.config?.value
  let result = false

  if (conditionType === 'contact_replied') {
    const { data: messages } = await supabase
      .from('messages').select('id')
      .eq('receiver_id', executionContext.userId)
      .ilike('content', `%${contact.phone}%`)
      .gte('created_at', executionContext.workflowStarted)
      .limit(1)
    result = (messages?.length || 0) > 0
  }
  if (conditionType === 'contact_status') result = contact.status === value
  if (conditionType === 'deal_value_over') {
    const { data: deals } = await supabase
      .from('deals').select('value')
      .eq('user_id', executionContext.userId)
      .eq('contact_id', contact.id)
      .order('value', { ascending: false })
      .limit(1)
    result = (deals?.[0]?.value || 0) > parseFloat(value)
  }

  return { success: true, condition_result: result, next_path: result ? 'yes' : 'no' }
}

async function executeWebhook(step: any, contact: any, userId: string) {
  try {
    const url = step.config?.url
    if (!url) return { success: false, error: 'No webhook URL configured' }

    const payload = {
      contact_id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      status: contact.status,
      source: contact.source,
      user_id: userId,
      timestamp: new Date().toISOString(),
      custom_data: step.config?.custom_data || {}
    }

    const response = await fetch(url, {
      method: step.config?.method || 'POST',
      headers: { 'Content-Type': 'application/json', ...(step.config?.headers || {}) },
      body: JSON.stringify(payload)
    })

    return { success: response.ok, status: response.status, response_body: await response.text() }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function executeRiverMessage(step: any, contact: any, userIntegrations: any, businessContext: any) {
  try {
    if (!ANTHROPIC_KEY) return { success: false, error: 'Anthropic API key not configured' }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `You are River, AI assistant for ${businessContext.business_name}.\nWrite a personalized ${step.config?.channel || 'SMS'} message for:\nName: ${contact.first_name} ${contact.last_name}\nContext: ${step.config?.context || 'follow up'}\nGoal: ${step.config?.goal || 'book appointment'}\nRules: Under 160 chars for SMS. Warm and professional. Sound human. No emojis.\nReturn ONLY the message text.`
        }]
      })
    })

    const data = await response.json()
    const message = data.content[0].text.trim()

    if (step.config?.channel === 'email') {
      return executeSendEmail({ config: { subject: step.config?.subject || 'Following up', body: message } }, contact, userIntegrations)
    }
    if (step.config?.channel === 'sms') {
      return executeSendSMS({ config: { message } }, contact, userIntegrations)
    }
    return { success: true, message }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─────────────────────────────────────────
// GET USER INTEGRATIONS
// ─────────────────────────────────────────
async function getUserIntegrations(userId: string) {
  const { data } = await supabase
    .from('integration_settings').select('integration_name, api_key, config')
    .eq('user_id', userId).eq('status', 'connected')

  const integrations: any = {}
  for (const item of data || []) {
    integrations[item.integration_name] = { api_key: item.api_key, ...((item.config as any) || {}) }
  }
  return integrations
}

// ─────────────────────────────────────────
// EXECUTE SINGLE STEP
// ─────────────────────────────────────────
async function executeStep(
  step: any, contact: any, userId: string, userIntegrations: any, businessContext: any, executionContext: any
): Promise<{ success: boolean; result: any; next_path?: string; wait_until?: string }> {
  console.log(`Executing step: ${step.type || step.blockType} for contact: ${contact.id}`)

  const stepType = step.type || step.blockType

  switch (stepType) {
    case 'send_sms':
      return { success: true, result: await executeSendSMS(step, contact, userIntegrations) }
    case 'send_email':
      return { success: true, result: await executeSendEmail(step, contact, userIntegrations) }
    case 'make_call':
    case 'river_call':
      return { success: true, result: await executeVapiCall(step, contact, userIntegrations) }
    case 'wait': {
      const waitResult = await executeWait(step)
      return { success: true, result: waitResult, wait_until: waitResult.wait_until }
    }
    case 'update_contact':
    case 'create_contact':
      return { success: true, result: await executeUpdateContact(step, contact, userId) }
    case 'condition': {
      const condResult = await executeCondition(step, contact, executionContext)
      return { success: true, result: condResult, next_path: condResult.next_path }
    }
    case 'send_webhook':
    case 'webhook':
      return { success: true, result: await executeWebhook(step, contact, userId) }
    case 'river_message':
      return { success: true, result: await executeRiverMessage(step, contact, userIntegrations, businessContext) }
    case 'notify_team':
      return { success: true, result: { notified: true, message: 'Team notification triggered' } }
    case 'book_appointment':
      return { success: true, result: { message: 'Appointment booking triggered', contact_id: contact.id } }
    default:
      console.log(`Unknown step type: ${stepType}`)
      return { success: true, result: { skipped: true, reason: `Unknown step type: ${stepType}` } }
  }
}

// ─────────────────────────────────────────
// MAIN WORKFLOW EXECUTOR
// ─────────────────────────────────────────
async function executeWorkflow(workflowId: string, contactId: string, userId: string, triggerData: any = {}) {
  const startedAt = new Date().toISOString()

  const { data: workflow } = await supabase
    .from('workflows').select('*').eq('id', workflowId).eq('user_id', userId).single()

  if (!workflow) {
    return { success: false, error: 'Workflow not found' }
  }

  const { data: contact } = await supabase
    .from('contacts').select('*').eq('id', contactId).eq('user_id', userId).single()

  if (!contact) {
    return { success: false, error: 'Contact not found' }
  }

  const { data: user } = await supabase
    .from('users').select('business_name, industry').eq('user_id', userId).single()

  const userIntegrations = await getUserIntegrations(userId)

  const { data: vapiAssistant } = await supabase
    .from('vapi_assistants').select('vapi_id').eq('user_id', userId).eq('is_active', true).single()
  const { data: vapiNumber } = await supabase
    .from('vapi_phone_numbers').select('vapi_id').eq('user_id', userId).eq('is_primary', true).single()

  if (vapiAssistant) userIntegrations.vapi = { ...userIntegrations.vapi, active_assistant_id: vapiAssistant.vapi_id }
  if (vapiNumber) userIntegrations.vapi = { ...userIntegrations.vapi, phone_number_id: vapiNumber.vapi_id }

  const businessContext = {
    business_name: user?.business_name || 'Our Business',
    industry: user?.industry || 'service business'
  }

  // Create run record using service role (bypasses RLS)
  const { data: runRecord } = await supabase
    .from('workflow_runs').insert({
      workflow_id: workflowId,
      contact_id: contactId,
      user_id: userId,
      status: 'running',
      trigger_data: triggerData,
      started_at: startedAt
    }).select().single()

  const runId = runRecord?.id

  // Steps can be stored as nodes array from the builder
  const steps: any[] = workflow.steps || []
  const executionContext = { userId, workflowStarted: startedAt, triggerData }

  let currentStepIndex = 0
  let stepsCompleted = 0
  const stepResults: any[] = []

  while (currentStepIndex < steps.length) {
    const step = steps[currentStepIndex]
    if (!step) break

    // Skip trigger nodes — they don't execute
    if (step.type === 'trigger') {
      currentStepIndex++
      continue
    }

    const stepResult = await executeStep(step, contact, userId, userIntegrations, businessContext, executionContext)

    stepResults.push({
      step_index: currentStepIndex,
      step_type: step.type || step.blockType,
      step_label: step.label || step.blockType,
      result: stepResult.result,
      executed_at: new Date().toISOString()
    })

    if (stepResult.wait_until) {
      if (runId) {
        await supabase.from('workflow_runs').update({
          status: 'waiting',
          current_step: currentStepIndex + 1,
          steps_completed: stepsCompleted,
          step_results: stepResults,
          wait_until: stepResult.wait_until,
          updated_at: new Date().toISOString()
        }).eq('id', runId)

        await supabase.from('workflow_scheduled').insert({
          workflow_id: workflowId,
          run_id: runId,
          contact_id: contactId,
          user_id: userId,
          resume_step: currentStepIndex + 1,
          scheduled_for: stepResult.wait_until
        })
      }
      return { success: true, status: 'waiting', wait_until: stepResult.wait_until, steps_completed: stepsCompleted, step_results: stepResults }
    }

    if (step.type === 'condition' && stepResult.next_path) {
      const nextStepId = step.config?.[stepResult.next_path + '_next']
      if (nextStepId) {
        const nextIndex = steps.findIndex((s: any) => s.id === nextStepId)
        if (nextIndex !== -1) {
          currentStepIndex = nextIndex
          stepsCompleted++
          continue
        }
      }
    }

    stepsCompleted++
    currentStepIndex++
  }

  if (runId) {
    await supabase.from('workflow_runs').update({
      status: 'completed',
      steps_completed: stepsCompleted,
      step_results: stepResults,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', runId)
  }

  await supabase.from('workflows').update({
    runs_count: (workflow.runs_count || 0) + 1
  }).eq('id', workflowId)

  return { success: true, status: 'completed', steps_completed: stepsCompleted, step_results: stepResults }
}

// ─────────────────────────────────────────
// TRIGGER HANDLER
// ─────────────────────────────────────────
async function handleTrigger(triggerType: string, userId: string, contactId: string, triggerData: any) {
  const { data: workflows } = await supabase
    .from('workflows').select('id, trigger, steps').eq('user_id', userId).eq('active', true)

  if (!workflows || workflows.length === 0) return []

  const matchingWorkflows = workflows.filter((w: any) => {
    if (w.trigger === triggerType) return true
    if (w.trigger === 'new_lead' && triggerType === 'contact_created') return true
    if (w.trigger === 'missed_call' && triggerType === 'call_missed') return true
    if (w.trigger === 'deal_stage_changed' && triggerType === 'deal_updated') return true
    return false
  })

  const results = []
  for (const workflow of matchingWorkflows) {
    const result = await executeWorkflow(workflow.id, contactId, userId, triggerData)
    results.push({ workflow_id: workflow.id, ...result })
  }
  return results
}

// ─────────────────────────────────────────
// MAIN SERVE
// ─────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, workflow_id, contact_id, user_id, trigger_type, trigger_data } = body

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'execute_workflow') {
      if (!workflow_id || !contact_id) {
        return new Response(JSON.stringify({ error: 'workflow_id and contact_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const result = await executeWorkflow(workflow_id, contact_id, user_id, trigger_data || {})
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'trigger') {
      if (!trigger_type || !contact_id) {
        return new Response(JSON.stringify({ error: 'trigger_type and contact_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const results = await handleTrigger(trigger_type, user_id, contact_id, trigger_data || {})
      return new Response(JSON.stringify({ success: true, workflows_triggered: results.length, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use execute_workflow or trigger' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error('Workflow engine error:', error)

    await supabase.from('error_logs').insert({
      function_name: 'workflow-engine',
      error_message: error.message
    }).catch(() => {})

    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
