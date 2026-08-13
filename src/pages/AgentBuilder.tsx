import { useState } from 'react'
import { Bot, Volume2, MessageSquare, Settings, Save, Loader2, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import VoicePicker from '@/components/voice-picker'
import { supabase } from '@/integrations/supabase/client'

type Tab = 'config' | 'voice' | 'prompt'

export default function AgentBuilder() {
  const [tab, setTab] = useState<Tab>('config')
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    name: '',
    type: 'voice' as 'voice' | 'chat',
    system_prompt: '',
    first_message: '',
    voice_id: '',
    voice_name: '',
    model: 'claude-3-5-sonnet-20241022',
    model_provider: 'anthropic',
    voice_provider: 'elevenlabs',
  })

  function handleVoiceSelect(voiceId: string, voiceName: string) {
    setConfig(prev => ({ ...prev, voice_id: voiceId, voice_name: voiceName }))
  }

  async function handleSave() {
    if (!config.name.trim()) return
    setSaving(true)
    try {
      // TODO: create a vapi-proxy edge function to handle assistant creation
      const { data, error } = await supabase.functions.invoke('vapi-proxy', {
        body: {
          action: 'create_assistant',
          data: {
            name: config.name,
            system_prompt: config.system_prompt,
            first_message: config.first_message,
            voice_id: config.voice_id,
            voice_provider: '11labs',
            model: config.model,
            model_provider: config.model_provider,
            tools: [],
          },
        },
      })

      if (error) throw error
      alert(`Agent created! Vapi ID: ${data.id}`)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'config' as Tab, label: 'Config', icon: Settings },
    { id: 'voice' as Tab, label: 'Voice', icon: Volume2 },
    { id: 'prompt' as Tab, label: 'Prompt', icon: MessageSquare },
  ]

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/buyer/hq"
          className="rounded-lg p-1.5 text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Bot className="h-6 w-6 text-white" />
        <h1 className="text-xl font-bold text-white">Agent Builder</h1>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-surface-card p-1">
        {tabs.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-white/[0.08] text-white'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'config' && (
        <div className="space-y-5 rounded-xl border border-border bg-surface-card p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Agent Name</label>
            <input
              type="text"
              value={config.name}
              onChange={e => setConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Sales Assistant"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-white/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Type</label>
            <div className="flex gap-2">
              {(['voice', 'chat'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setConfig(prev => ({ ...prev, type: t }))}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                    config.type === t
                      ? 'border-white/30 bg-white/[0.08] text-white'
                      : 'border-border text-ink-muted hover:text-ink'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">First Message</label>
            <input
              type="text"
              value={config.first_message}
              onChange={e => setConfig(prev => ({ ...prev, first_message: e.target.value }))}
              placeholder="Hi! How can I help you today?"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-white/20 focus:outline-none"
            />
          </div>

          {config.voice_id && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
              <p className="text-sm text-green-400">
                Voice: <span className="font-medium">{config.voice_name}</span> ({config.voice_id.slice(0, 8)}...)
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'voice' && (
        <VoicePicker
          selectedVoiceId={config.voice_id}
          onSelect={handleVoiceSelect}
        />
      )}

      {tab === 'prompt' && (
        <div className="space-y-4 rounded-xl border border-border bg-surface-card p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">System Prompt</label>
            <textarea
              value={config.system_prompt}
              onChange={e => setConfig(prev => ({ ...prev, system_prompt: e.target.value }))}
              rows={12}
              placeholder="You are a helpful AI assistant for..."
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-white/20 focus:outline-none resize-none"
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !config.name.trim()}
          className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Creating...' : 'Create Agent'}
        </button>
      </div>
    </div>
  )
}
