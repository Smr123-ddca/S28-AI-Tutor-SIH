import React, { useState, useEffect } from 'react';

/**
 * =====================================================================
 * SOUND MANAGER FOR BODH (AI Tutor)
 * =====================================================================
 * Centralized sound management for short UI cues (not speech narration).
 *
 * Designed to complement external Text-To-Speech (TTS) engines without
 * collision.
 *
 * Features:
 *  - Synthesized crystal-clear Web Audio API sound cues (zero external latency)
 *  - Safe fallback to custom asset files under /assets/sounds/ if provided
 *  - Autoplay compliance: AudioContext starts on first user interaction
 *  - Persistent mute state in localStorage
 *  - Exposed soundsEnabled flag for TTS coordination
 * =====================================================================
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = this.loadMuteState();
    this.soundsEnabled = !this.isMuted;
    this.hasInteracted = false;
    this.listeners = new Set();

    // Unlock AudioContext on first user interaction (browser autoplay policy)
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initContext();
        this.hasInteracted = true;
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
    }
  }

  loadMuteState() {
    try {
      const saved = localStorage.getItem('bodh_sound_muted');
      return saved === 'true';
    } catch {
      return false;
    }
  }

  saveMuteState(muted) {
    try {
      localStorage.setItem('bodh_sound_muted', muted ? 'true' : 'false');
    } catch (e) {
      console.warn('Could not save sound settings to localStorage', e);
    }
  }

  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.soundsEnabled = !this.isMuted;
    this.saveMuteState(this.isMuted);
    this.notify();
    return this.isMuted;
  }

  setMuted(muted) {
    this.isMuted = !!muted;
    this.soundsEnabled = !this.isMuted;
    this.saveMuteState(this.isMuted);
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn({ isMuted: this.isMuted, soundsEnabled: this.soundsEnabled }));
  }

  /**
   * Play a short UI sound cue
   * @param {'messageSent' | 'responseReady' | 'stateChange' | 'correct' | 'incorrect' | 'click'} soundName
   */
  playSound(soundName) {
    if (this.isMuted) return;

    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    switch (soundName) {
      case 'messageSent': {
        // Subtle upward pop blip (520Hz -> 780Hz)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.exponentialRampToValueAtTime(780, t + 0.08);

        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.09);
        break;
      }

      case 'responseReady': {
        /**
         * [TTS INTEGRATION NOTE FOR TEXT-TO-SPEECH DEV]:
         * When speech narration is active, suppress this chime if speech begins immediately
         * to avoid audio clutter.
         */
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        // Major triad chime: E5 (659Hz) & B5 (987Hz)
        osc1.frequency.setValueAtTime(659.25, t);
        osc2.frequency.setValueAtTime(987.77, t + 0.06);

        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(t);
        osc1.stop(t + 0.35);
        osc2.start(t + 0.06);
        osc2.stop(t + 0.35);
        break;
      }

      case 'correct': {
        // Cheerful ascending arpeggio (C5 -> E5 -> G5)
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + i * 0.08);

          gain.gain.setValueAtTime(0.07, t + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.22);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + i * 0.08);
          osc.stop(t + i * 0.08 + 0.22);
        });
        break;
      }

      case 'incorrect': {
        // Gentle neutral descending tone (not harsh or punishing)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, t);
        osc.frequency.exponentialRampToValueAtTime(310, t + 0.2);

        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
        break;
      }

      case 'stateChange': {
        // Soft subtle click/tick
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        gain.gain.setValueAtTime(0.03, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.04);
        break;
      }

      case 'click': {
        // Light subtle interaction click
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        gain.gain.setValueAtTime(0.02, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.03);
        break;
      }

      default:
        break;
    }
  }
}

export const soundManager = new SoundManager();

export function useSoundManager() {
  const [soundState, setSoundState] = React.useState({
    isMuted: soundManager.isMuted,
    soundsEnabled: soundManager.soundsEnabled
  });

  React.useEffect(() => {
    return soundManager.subscribe(setSoundState);
  }, []);

  return {
    isMuted: soundState.isMuted,
    soundsEnabled: soundState.soundsEnabled,
    toggleMute: () => soundManager.toggleMute(),
    playSound: (name) => soundManager.playSound(name)
  };
}
