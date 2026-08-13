import { useState, useEffect, useRef } from 'react'
import { Search, Play, Square, Check, Loader2, Volume2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface Voice {
  id: string
  name: string
  accent: string | null
  gender: string | null
  age: string | null
  description: string | null
  category: string | null
  preview_url: string | null
}

interface VoicePickerProps {
  selectedVoiceId: string | null
  onSelect: (voiceId: string, voiceName: string) => void
}

export default function VoicePicker({ selectedVoiceId, onSelect }: VoicePickerProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchVoices()
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  async function fetchVoices() {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('voices', {
        body: { action: 'list' },
      })
      if (fnError) throw fnError
      setVoices(data.voices)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePreview(voice: Voice) {
    if (playingId === voice.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    setPreviewLoading(voice.id)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('voices', {
        body: { action: 'preview', voice_id: voice.id },
      })
      if (fnError) throw fnError

      const blob = data instanceof Blob ? data : new Blob([data], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)

      audio.onended = () => {
        setPlayingId(null)
        URL.revokeObjectURL(url)
      }

      audio.onerror = () => {
        setPlayingId(null)
        URL.revokeObjectURL(url)
      }

      audioRef.current = audio
      await audio.play()
      setPlayingId(voice.id)
    } catch {
      setPlayingId(null)
    } finally {
      setPreviewLoading(null)
    }
  }

  const filtered = voices.filter(v => {
    const q = search.toLowerCase()
    return (
      v.name.toLowerCase().includes(q) ||
      v.accent?.toLowerCase().includes(q) ||
      v.gender?.toLowerCase().includes(q) ||
      v.description?.toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
        <span className="ml-2 text-sm text-ink-muted">Loading voices...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center text-sm text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">{voices.length} voices available</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Search voices by name, accent, gender..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-10 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-white/20 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(voice => {
          const isSelected = selectedVoiceId === voice.id
          const isPlaying = playingId === voice.id
          const isLoadingPreview = previewLoading === voice.id

          return (
            <div
              key={voice.id}
              className={`group relative flex items-center gap-3 rounded-xl border p-3 transition-all cursor-pointer ${
                isSelected
                  ? 'border-white/30 bg-white/[0.08]'
                  : 'border-border bg-surface-card hover:border-border-strong hover:bg-white/[0.04]'
              }`}
              onClick={() => onSelect(voice.id, voice.name)}
            >
              <button
                onClick={e => {
                  e.stopPropagation()
                  handlePreview(voice)
                }}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-ink-light transition-colors hover:bg-white/[0.12] hover:text-white"
              >
                {isLoadingPreview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Square className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">{voice.name}</span>
                  {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-green-400" />}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                  {voice.gender && <span className="capitalize">{voice.gender}</span>}
                  {voice.gender && voice.accent && <span>·</span>}
                  {voice.accent && <span className="capitalize">{voice.accent}</span>}
                  {voice.age && <span>· {voice.age}</span>}
                </div>
              </div>

              {isPlaying && (
                <Volume2 className="h-4 w-4 flex-shrink-0 animate-pulse text-white" />
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-muted">No voices match "{search}"</p>
      )}
    </div>
  )
}
