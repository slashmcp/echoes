'use client'

import { Mic, MicOff, SendHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AnswerInputProps {
  onSubmit: (message: string) => void
  disabled: boolean
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: any) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

export function AnswerInput({ onSubmit, disabled }: AnswerInputProps) {
  const [value, setValue] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [micSupported, setMicSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const Ctor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null
    setMicSupported(Boolean(Ctor))
  }, [])

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus()
  }, [disabled])

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    recognitionRef.current?.stop()
    onSubmit(trimmed)
    setValue('')
  }

  function toggleMic() {
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const Ctor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null
    if (!Ctor) return

    const recognition: SpeechRecognitionLike = new Ctor()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }
      setValue(transcript)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Respect CJK IME composition before treating Enter as submit.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="flex flex-col gap-2 border-t border-border p-3 sm:p-4"
    >
      <label htmlFor="answer" className="sr-only">
        Your answer to the riddle
      </label>
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          id="answer"
          rows={2}
          value={value}
          maxLength={600}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled ? 'The duel has ended.' : 'Speak, morsel. Enter to answer, Shift+Enter for a new line.'
          }
          className="min-h-[3.5rem] flex-1 resize-none border border-input bg-black/40 px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-50"
        />

        <div className="flex flex-col gap-2">
          {micSupported && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleMic}
              disabled={disabled}
              aria-label={isListening ? 'Stop dictation' : 'Answer by voice'}
              aria-pressed={isListening}
              className={cn(isListening && 'animate-pulse-ring border-primary text-primary')}
            >
              {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </Button>
          )}
          <Button
            type="submit"
            size="icon"
            disabled={disabled || !value.trim()}
            aria-label="Send your answer"
          >
            <SendHorizontal className="size-4" />
          </Button>
        </div>
      </div>
      <p className="text-[10px] tracking-widest text-muted-foreground/70 uppercase">
        {isListening
          ? 'Listening — the mountain is recording you'
          : 'Wit is your only weapon. Insolence has a price.'}
      </p>
    </form>
  )
}
