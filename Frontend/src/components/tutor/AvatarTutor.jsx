import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Mic, Volume2, Sparkles, Activity } from 'lucide-react';
import { Pill } from '../common/Pill';

// Import photo assets for idle, listening, thinking, and blink states
import idleImg from '../../assets/avatar/avatar-idle.jpg';
import listeningImg from '../../assets/avatar/avatar-listening.jpg';
import thinkingImg from '../../assets/avatar/avatar-thinking.jpg';
import blinkImg from '../../assets/avatar/avatar-blink.jpg';

// Import speaking video loop asset
import speakingVideo from '../../assets/avatar/avatar-speaking.mp4';

/**
 * =====================================================================
 * LIVING AVATAR TUTOR — HYBRID PHOTO + VIDEO PRESENCE TILE
 * =====================================================================
 * Smooth, continuous photo-to-video crossfading:
 *  1. Idle, Listening, and Thinking rendered as pre-decoded static photos
 *  2. Speaking state rendered as a looping, permanently muted video layer
 *  3. Overlapping CSS opacity transitions (350ms ease-in-out) with zero black flash
 *  4. Video is primed/playing before fade-in and paused only after fade-out completes
 *  5. Eye-blink overlay operates naturally during idle/listening/thinking states
 *  6. Video is strictly & permanently muted in both DOM attributes and code
 * =====================================================================
 */
export function AvatarTutor({
  isSpeaking = false,
  isThinking = false,
  state: stateProp,
  topic = 'Algorithms & Binary Search Trees',
  className = ''
}) {
  // Derive effective primary state
  const effectiveState = stateProp || (isSpeaking ? 'speaking' : isThinking ? 'thinking' : 'idle');

  // Eye-blink state
  const [isBlinking, setIsBlinking] = useState(false);

  // Equalizer waveform bars
  const [waveformBars, setWaveformBars] = useState([8, 14, 22, 16, 26, 12, 18, 10, 20, 15, 12, 8]);

  const blinkTimerRef = useRef(null);
  const videoRef = useRef(null);

  // Active state conditions
  const isListeningActive = effectiveState === 'listening';
  const isThinkingActive = effectiveState === 'thinking' || isThinking;
  const isSpeakingActive = effectiveState === 'speaking' || isSpeaking;

  // 1. Asynchronously preload & decode static images on mount
  const staticImages = useMemo(() => [
    { key: 'idle', src: idleImg, alt: 'AI Tutor Idle' },
    { key: 'listening', src: listeningImg, alt: 'AI Tutor Listening' },
    { key: 'thinking', src: thinkingImg, alt: 'AI Tutor Thinking' },
    { key: 'blink', src: blinkImg, alt: 'AI Tutor Blinking' }
  ], []);

  useEffect(() => {
    async function preloadStaticImages() {
      const decodePromises = staticImages.map(({ src }) => {
        const img = new Image();
        img.src = src;
        if (typeof img.decode === 'function') {
          return img.decode().catch((err) => {
            console.warn('Image decode notice (falling back to cached load):', err);
          });
        }
        return Promise.resolve();
      });

      await Promise.all(decodePromises);
    }

    preloadStaticImages();
  }, [staticImages]);

  // 2. Preload, Prime & Permanently Mute the Speaking Video on Mount
  useEffect(() => {
    if (videoRef.current) {
      // Explicitly enforce muted properties in code (browser safety measure)
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      videoRef.current.volume = 0;

      // Prime video buffer
      videoRef.current.load();
    }
  }, []);

  // 3. Coordinate Video Playback with Speaking Transitions
  useEffect(() => {
    let fadeOutTimeout = null;

    if (isSpeakingActive) {
      if (videoRef.current) {
        videoRef.current.muted = true;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Speaking video playback noticed:', err);
          });
        }
      }
    } else {
      // Pause video only after the 350ms crossfade transition has completely finished
      fadeOutTimeout = setTimeout(() => {
        if (!isSpeakingActive && videoRef.current) {
          videoRef.current.pause();
        }
      }, 400);
    }

    return () => {
      if (fadeOutTimeout) clearTimeout(fadeOutTimeout);
    };
  }, [isSpeakingActive]);

  // 4. Randomized Eye-Blink Loop (every 3-5s, lasts ~150ms during non-speaking states)
  useEffect(() => {
    if (isSpeakingActive) {
      setIsBlinking(false);
      return;
    }

    const scheduleNextBlink = () => {
      const delay = Math.floor(Math.random() * 2500) + 3000; // 3000ms - 5500ms
      blinkTimerRef.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 150);
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, [isSpeakingActive]);

  // 5. Live Audio Equalizer Waveform Simulation
  useEffect(() => {
    if (isSpeakingActive) {
      const interval = setInterval(() => {
        setWaveformBars(
          Array.from({ length: 14 }, () => Math.floor(Math.random() * 26) + 6)
        );
      }, 110);
      return () => clearInterval(interval);
    } else if (isThinkingActive) {
      setWaveformBars([4, 6, 14, 20, 14, 6, 4, 6, 14, 20, 14, 6, 4, 6]);
    } else {
      setWaveformBars([6, 8, 10, 8, 12, 6, 8, 6, 10, 6, 8, 6, 8, 6]);
    }
  }, [isSpeakingActive, isThinkingActive]);

  const getStateConfig = () => {
    switch (effectiveState) {
      case 'listening':
        return {
          label: 'Listening...',
          color: 'yellow',
          icon: Mic,
          borderColor: 'var(--color-yellow)',
          dotColor: 'var(--color-yellow)'
        };
      case 'thinking':
        return {
          label: 'Retrieving Syllabus...',
          color: 'purple',
          icon: Sparkles,
          borderColor: 'var(--color-purple)',
          dotColor: 'var(--color-purple)'
        };
      case 'speaking':
        return {
          label: 'Explaining Concept',
          color: 'orange',
          icon: Volume2,
          borderColor: 'var(--color-orange)',
          dotColor: 'var(--color-orange)'
        };
      default:
        return {
          label: 'Tutor Online',
          color: 'green',
          icon: Activity,
          borderColor: 'rgba(255, 255, 255, 0.18)',
          dotColor: '#22c55e'
        };
    }
  };

  const config = getStateConfig();

  return (
    <div
      className={`card-ink ${className}`}
      style={{
        width: '100%',
        borderRadius: 'var(--radius-2xl)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        position: 'relative',
        overflow: 'hidden',
        border: `2px solid ${
          isSpeakingActive
            ? 'var(--color-orange)'
            : isThinkingActive
            ? 'var(--color-purple)'
            : 'rgba(255, 255, 255, 0.12)'
        }`,
        boxShadow:
          isSpeakingActive
            ? 'var(--shadow-orange)'
            : 'var(--shadow-lg)',
        transition: 'all var(--transition-normal)'
      }}
    >
      {/* =====================================================================
          VIDEO PRESENCE SCREEN TILE (Meet / Zoom Tile Style)
          ===================================================================== */}
      <div
        className={isSpeakingActive ? 'speaking-glow' : ''}
        style={{
          width: '100%',
          aspectRatio: '16 / 11',
          minHeight: '340px',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#efe8df',
          border: `2px solid ${
            isSpeakingActive
              ? 'var(--color-orange)'
              : isThinkingActive
              ? 'var(--color-purple)'
              : 'rgba(255, 255, 255, 0.15)'
          }`,
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          transition: 'border-color var(--transition-normal)'
        }}
      >
        {/* Pulsing Concentric Outer Ring for Speaking */}
        {isSpeakingActive && (
          <div
            className="animate-pulse-ring"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100%',
              height: '100%',
              transform: 'translate(-50%, -50%)',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'rgba(255, 87, 52, 0.12)',
              pointerEvents: 'none',
              zIndex: 20
            }}
          />
        )}

        {/* =====================================================================
            STACKED PERMANENTLY-MOUNTED LAYERS (Pure CSS Opacity Crossfades)
            ===================================================================== */}
        <div
          className={effectiveState === 'idle' ? 'animate-ken-burns' : ''}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}
        >
          {/* Layer 1: Permanent Baseline Idle Photo (zIndex: 1, Opacity 1) */}
          <img
            src={idleImg}
            alt="AI Tutor Idle"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 15%',
              zIndex: 1,
              opacity: 1,
              pointerEvents: 'none'
            }}
          />

          {/* Layer 2: Listening State Photo (zIndex: 2) */}
          <img
            src={listeningImg}
            alt="AI Tutor Listening"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 15%',
              zIndex: 2,
              opacity: isListeningActive ? 1 : 0,
              transition: 'opacity 350ms ease-in-out',
              pointerEvents: 'none'
            }}
          />

          {/* Layer 3: Thinking State Photo (zIndex: 3) */}
          <img
            src={thinkingImg}
            alt="AI Tutor Thinking"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 15%',
              zIndex: 3,
              opacity: isThinkingActive ? 1 : 0,
              transition: 'opacity 350ms ease-in-out',
              pointerEvents: 'none'
            }}
          />

          {/* Layer 4: Speaking Video Loop (zIndex: 4, Permanently Muted, 1:1 Native Square Video) */}
          <video
            ref={videoRef}
            src={speakingVideo}
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
              zIndex: 4,
              opacity: isSpeakingActive ? 1 : 0,
              transition: 'opacity 350ms ease-in-out',
              pointerEvents: 'none'
            }}
          />

          {/* Layer 5: Eye-Blink Overlay Photo (zIndex: 10, Natural eye blink over static photos) */}
          <img
            src={blinkImg}
            alt="AI Tutor Blink"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 15%',
              zIndex: 10,
              opacity: isBlinking && !isSpeakingActive ? 1 : 0,
              transition: 'opacity 120ms ease-in-out',
              pointerEvents: 'none'
            }}
          />
        </div>

        {/* TOP GLASS OVERLAY: Live Presence Badge + Status */}
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            right: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 30,
            pointerEvents: 'none'
          }}
        >
          {/* Presence Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(21, 19, 19, 0.75)',
              backdropFilter: 'blur(10px)',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: config.dotColor,
                boxShadow: `0 0 12px ${config.dotColor}`,
                transition: 'background-color var(--transition-fast)'
              }}
            />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>
              BODH Live Presence
            </span>
          </div>

          {/* Mode / State Pill */}
          <div style={{ pointerEvents: 'auto' }}>
            <Pill color={config.color} size="sm" icon={config.icon}>
              {config.label}
            </Pill>
          </div>
        </div>

        {/* BOTTOM GLASS OVERLAY: Equalizer Audio Waveform */}
        <div
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            right: '1rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 30,
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '34px',
              backgroundColor: 'rgba(21, 19, 19, 0.8)',
              backdropFilter: 'blur(12px)',
              padding: '0.35rem 1rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
            }}
          >
            {waveformBars.map((height, i) => (
              <div
                key={i}
                style={{
                  width: '4px',
                  height: `${height}px`,
                  backgroundColor:
                    isSpeakingActive
                      ? 'var(--color-orange)'
                      : isThinkingActive
                      ? 'var(--color-purple)'
                      : 'rgba(255, 255, 255, 0.4)',
                  borderRadius: '4px',
                  transition: 'height 0.11s ease, background-color var(--transition-fast)'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================================
          BOTTOM GROUNDING FOCUS CARD
          ===================================================================== */}
      <div
        style={{
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          padding: '0.9rem 1.15rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 2
        }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            color: 'rgba(255, 255, 255, 0.5)',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.06em',
            marginBottom: '0.25rem'
          }}
        >
          Curriculum Grounding Focus
        </div>
        <div
          style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#ffffff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {topic}
        </div>
      </div>
    </div>
  );
}
