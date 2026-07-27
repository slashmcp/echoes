'use client'

/**
 * Centralized Sound Manager for Echoes of the Scale.
 * Synthesizes retro game SFX dynamically using Web Audio API oscillators and gain nodes
 * to keep the game fully functional and lightweight without external audio asset downloads.
 */
class SoundManager {
  private ctx: AudioContext | null = null
  private ambientOscs: { osc: OscillatorNode; gain: GainNode }[] = []
  private isMuted: boolean = false

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        this.ctx = new AudioContextClass()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute
    if (mute) {
      this.stopAmbiance()
    } else {
      this.startAmbiance()
    }
  }

  // ── Ambient Loops ─────────────────────────────────────────────────────────

  startAmbiance() {
    if (this.isMuted) return
    this.initCtx()
    if (!this.ctx) return

    if (this.ambientOscs.length > 0) return // Already playing

    try {
      // 1. Low volcanic rumble oscillator (38Hz sine + 55Hz triangle)
      const osc1 = this.ctx.createOscillator()
      const gain1 = this.ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(38, this.ctx.currentTime)
      gain1.gain.setValueAtTime(0.04, this.ctx.currentTime)

      const osc2 = this.ctx.createOscillator()
      const gain2 = this.ctx.createGain()
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(55, this.ctx.currentTime)
      gain2.gain.setValueAtTime(0.02, this.ctx.currentTime)

      // Connect
      osc1.connect(gain1)
      gain1.connect(this.ctx.destination)
      osc2.connect(gain2)
      gain2.connect(this.ctx.destination)

      // Start
      osc1.start()
      osc2.start()

      this.ambientOscs = [
        { osc: osc1, gain: gain1 },
        { osc: osc2, gain: gain2 }
      ]
    } catch (e) {
      console.warn('Ambiance synthesis failed:', e)
    }
  }

  stopAmbiance() {
    this.ambientOscs.forEach(({ osc, gain }) => {
      try {
        osc.stop()
        osc.disconnect()
        gain.disconnect()
      } catch {}
    });
    this.ambientOscs = []
  }

  // ── Snappy UI Sounds ───────────────────────────────────────────────────────

  /** Mechanical keyboard tap blip */
  playTypeClick() {
    if (this.isMuted) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(800 + Math.random() * 200, now)
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.05)

    gain.gain.setValueAtTime(0.015, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.06)
  }

  /** Chime when new message renders */
  playMessagePop() {
    if (this.isMuted) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.setValueAtTime(480, now + 0.06)

    gain.gain.setValueAtTime(0.04, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.24)
  }

  /** Metallic hover sound */
  playTick() {
    if (this.isMuted) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1400, now)

    gain.gain.setValueAtTime(0.01, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.03)
  }

  // ── Combat SFX ─────────────────────────────────────────────────────────────

  /** High-pitch glass/crystal breaking sound */
  playShieldShatter() {
    if (this.isMuted) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    
    // Play multiple overlapping high frequency metallic oscillators
    const freqs = [1800, 2200, 2900]
    freqs.forEach((freq, idx) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + idx * 0.01)
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.4)

      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 0.5)
    })
  }

  /** Low visceral physical thud */
  playDamageImpact() {
    if (this.isMuted) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(160, now)
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.4)
  }

  /** Distorted heavy dragon roar */
  playDragonRoar() {
    if (this.isMuted) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(90, now)
    osc.frequency.linearRampToValueAtTime(140, now + 0.2)
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.7)

    gain.gain.setValueAtTime(0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.85)
  }
}

export const soundManager = new SoundManager()
