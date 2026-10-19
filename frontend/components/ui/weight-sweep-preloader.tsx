'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface WeightSweepPreloaderProps {
  children?: React.ReactNode;
  loop?: boolean;
  progress?: number;
  durationMs?: number;
  preset?: 'paper' | 'ink' | 'vermilion' | 'bone' | 'emerald';
  palette?: { paper?: string; ink?: string };
  label?: string;
  caption?: string;
  message?: string;
  weights?: [number, number];
  hud?: boolean;
  fontFamily?: string;
  serifFamily?: string;
  monoFamily?: string;
  height?: string;
  onComplete?: () => void;
  className?: string;
  fixed?: boolean;
}

const PRESETS: Record<string, { paper: string; ink: string }> = {
  paper: { paper: '#f4f5f1', ink: '#151412' },
  ink: { paper: '#121110', ink: '#ece6da' },
  vermilion: { paper: '#ec472c', ink: '#140c0a' },
  bone: { paper: '#e6dfd1', ink: '#2b2620' },
  emerald: { paper: '#162e22', ink: '#D4F63D' },
};

const DEFAULT_SANS =
  '"Inter Tight", "Inter Variable", "Inter", "Segoe UI Variable Display", "SF Pro Display", "Helvetica Neue", system-ui, sans-serif';
const DEFAULT_SERIF =
  '"Instrument Serif", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const DEFAULT_MONO =
  '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace';

const TICK_COUNT = 40;
const PANEL_SLIDE_DURATION = 900;
const PANEL_PAUSE_DURATION = 1300;
const LIFT_DURATION = 700;

function wspClamp01(z: number): number {
  return z < 0 ? 0 : z > 1 ? 1 : z;
}

function wspSimulated(z: number): number {
  const O = wspClamp01(z);
  const Z = O < 0.5 ? 4 * O * O * O : 1 - Math.pow(-2 * O + 2, 3) / 2;
  const y = 0.035 * Math.sin(O * Math.PI * 3) * Math.sin(O * Math.PI);
  return Math.max(0, Math.min(100, (Z - y) * 100));
}

function wspWeight(z: number, minW: number, maxW: number): number {
  const y = Math.max(1, Math.min(1000, minW));
  const x = Math.max(1, Math.min(1000, maxW));
  return Math.round(y + (x - y) * wspClamp01(z / 100));
}

function wspTracking(weight: number): number {
  return -0.02 - 0.06 * wspClamp01((weight - 100) / 800);
}

function wspTicks(z: number, maxTicks: number): number {
  return Math.round(wspClamp01(z / 100) * maxTicks);
}

function wspPad(z: number): string {
  const O = Math.max(0, Math.min(100, Math.floor(z)));
  return (O < 10 ? '00' : O < 100 ? '0' : '') + O;
}

const WSP_STYLES = `
.wsp-root {
  position: relative;
  width: 100%;
  overflow: hidden;
  isolation: isolate;
}
.wsp-root.wsp-fixed {
  position: fixed;
  inset: 0;
  z-index: 99999;
}
.wsp-gate {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  container-type: size;
  background: var(--wsp-paper);
  color: var(--wsp-ink);
  transition: opacity 700ms cubic-bezier(.65,0,.35,1), visibility 0s linear 700ms;
  -webkit-font-smoothing: antialiased;
  cursor: default;
}
.wsp-gate[data-phase="lift"] {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.wsp-gate[data-loop="true"] {
  cursor: pointer;
}
.wsp-hud {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: clamp(18px, 3.2cqw, 34px) clamp(18px, 3.2cqw, 40px) 0;
  font-family: var(--wsp-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .2em;
  text-transform: uppercase;
}
.wsp-hud span:last-child {
  opacity: .55;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.wsp-rule {
  position: absolute;
  left: clamp(18px, 3.2cqw, 40px);
  right: clamp(18px, 3.2cqw, 40px);
  top: calc(clamp(18px, 3.2cqw, 34px) + 22px);
  height: 0;
  border-top: 0.5px solid currentColor;
  opacity: .18;
}
.wsp-count {
  position: absolute;
  left: clamp(6px, 1.4cqw, 22px);
  bottom: 0;
  margin: 0;
  font-family: var(--wsp-sans);
  line-height: .74;
  white-space: nowrap;
  font-size: min(70cqh, 43cqw);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1, "ss01" 1;
  transform: translateY(6%);
  will-change: font-weight;
  user-select: none;
}
.wsp-foot {
  position: absolute;
  left: clamp(18px, 3.2cqw, 40px);
  right: clamp(18px, 3.2cqw, 40px);
  top: calc(clamp(18px, 3.2cqw, 34px) + 38px);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  font-family: var(--wsp-mono);
  font-size: 10px;
  letter-spacing: .2em;
  text-transform: uppercase;
}
.wsp-foot > span {
  opacity: .55;
  white-space: nowrap;
}
.wsp-rail {
  display: flex;
  align-items: flex-end;
  gap: 0;
  flex: 0 1 min(46cqw, 520px);
  justify-content: space-between;
  height: 11px;
}
.wsp-tick {
  width: 1px;
  height: 5px;
  background: currentColor;
  opacity: .2;
  transition: opacity 180ms linear;
}
.wsp-tick[data-major="true"] {
  height: 11px;
}
.wsp-tick[data-on="true"] {
  opacity: 1;
}
.wsp-panel {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 14px;
  background: var(--wsp-ink);
  color: var(--wsp-paper);
  transform: translateY(101%);
  transition: transform 900ms cubic-bezier(.76,0,.24,1);
  padding: 24px;
  text-align: center;
}
.wsp-gate[data-phase="panel"] .wsp-panel,
.wsp-gate[data-phase="lift"] .wsp-panel {
  transform: none;
}
.wsp-line {
  margin: 0;
  font-family: var(--wsp-serif);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(28px, 5.8cqw, 72px);
  line-height: 1.1;
  letter-spacing: -.01em;
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 600ms ease 420ms, transform 800ms cubic-bezier(.2,.7,.1,1) 420ms;
}
.wsp-replay {
  font-family: var(--wsp-mono);
  font-size: 11px;
  letter-spacing: .2em;
  text-transform: uppercase;
  opacity: 0;
  transition: opacity 500ms ease 900ms;
}
.wsp-gate[data-phase="panel"] .wsp-line {
  opacity: 1;
  transform: none;
}
.wsp-gate[data-phase="panel"][data-loop="true"] .wsp-replay {
  opacity: .45;
}
.wsp-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  .wsp-panel {
    transition: none;
  }
  .wsp-line, .wsp-replay {
    transition: none;
    transform: none;
  }
  .wsp-tick {
    transition: none;
  }
}
`;

export default function WeightSweepPreloader({
  children,
  loop = false,
  progress,
  durationMs = 2600,
  preset = 'paper',
  palette,
  label = 'Koperasi Sinar Pagi Sejahtera',
  caption = 'Memuat Ekosistem Pertanian',
  message = 'Dari Minahasa Utara untuk Nusantara.',
  weights = [100, 900],
  hud = true,
  fontFamily = DEFAULT_SANS,
  serifFamily = DEFAULT_SERIF,
  monoFamily = DEFAULT_MONO,
  height = '100svh',
  onComplete,
  className = '',
  fixed = false,
}: WeightSweepPreloaderProps) {
  const chosenPalette = {
    ...(PRESETS[preset] || PRESETS.paper),
    ...(palette || {}),
  };

  const [currentProgress, setCurrentProgress] = useState(0);
  const [phase, setPhase] = useState<'load' | 'panel' | 'lift' | 'done'>('load');
  const [replayKey, setReplayKey] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const progressRef = useRef(progress);
  progressRef.current = progress;

  // Listen for prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setPrefersReducedMotion(mediaQuery.matches);
    updateMotion();
    mediaQuery.addEventListener('change', updateMotion);
    return () => mediaQuery.removeEventListener('change', updateMotion);
  }, []);

  // Simulated or real progress tracking
  useEffect(() => {
    if (phase !== 'load') return;

    let animFrame = 0;
    let smoothProgress = 0;
    const startTime = performance.now();
    const safeDuration = Math.max(400, durationMs);

    const onTick = (now: number) => {
      const explicitProgress = progressRef.current;
      const targetProgress =
        explicitProgress === undefined
          ? wspSimulated((now - startTime) / safeDuration)
          : Math.max(0, Math.min(100, Number(explicitProgress) || 0));

      smoothProgress = prefersReducedMotion
        ? Math.max(smoothProgress, targetProgress)
        : Math.max(
            smoothProgress,
            smoothProgress + (targetProgress - smoothProgress) * 0.18
          );

      if (targetProgress >= 100 && smoothProgress > 99.6) {
        smoothProgress = 100;
      }

      setCurrentProgress(smoothProgress);

      if (smoothProgress >= 100) {
        setPhase(message ? 'panel' : 'lift');
        return;
      }

      animFrame = requestAnimationFrame(onTick);
    };

    animFrame = requestAnimationFrame(onTick);
    return () => cancelAnimationFrame(animFrame);
  }, [phase, replayKey, durationMs, prefersReducedMotion, message]);

  // Phase transitions: panel -> lift -> done
  useEffect(() => {
    if (phase === 'panel') {
      const timer = setTimeout(() => {
        if (!loop) setPhase('lift');
      }, (prefersReducedMotion ? 0 : PANEL_SLIDE_DURATION) + PANEL_PAUSE_DURATION);
      return () => clearTimeout(timer);
    }

    if (phase === 'lift') {
      const timer = setTimeout(() => {
        setPhase('done');
        if (!loop) {
          onCompleteRef.current?.();
        }
      }, prefersReducedMotion ? 0 : LIFT_DURATION);
      return () => clearTimeout(timer);
    }
  }, [phase, loop, prefersReducedMotion]);

  // Replay when loop is active
  useEffect(() => {
    if (!loop || phase !== 'panel') return;
    const timer = setTimeout(() => {
      handleReplay();
    }, PANEL_SLIDE_DURATION + PANEL_PAUSE_DURATION + 1600);
    return () => clearTimeout(timer);
  }, [loop, phase, replayKey]);

  const handleReplay = () => {
    setCurrentProgress(0);
    setPhase('load');
    setReplayKey((k) => k + 1);
  };

  const [minWeight, maxWeight] = weights;
  const currentWeight = wspWeight(currentProgress, minWeight, maxWeight);
  const activeTicks = wspTicks(currentProgress, TICK_COUNT);
  const displayCount = wspPad(currentProgress);
  const isDone = phase === 'done';

  return (
    <div
      className={`wsp-root ${fixed ? 'wsp-fixed' : ''} ${className}`}
      style={
        {
          height: fixed ? '100svh' : height,
          '--wsp-paper': chosenPalette.paper,
          '--wsp-ink': chosenPalette.ink,
          '--wsp-sans': fontFamily,
          '--wsp-serif': serifFamily,
          '--wsp-mono': monoFamily,
        } as React.CSSProperties
      }
    >
      <style dangerouslySetInnerHTML={{ __html: WSP_STYLES }} />

      {/* Children content underneath (if embedded) */}
      {!loop && children}

      {/* Main Preloader Gate Screen */}
      {(!isDone || loop) && (
        <div
          className="wsp-gate"
          data-phase={phase}
          data-loop={loop}
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.floor(currentProgress)}
          onClick={loop && phase === 'panel' ? handleReplay : undefined}
        >
          {/* Top HUD */}
          {hud && (
            <>
              <div className="wsp-hud" aria-hidden="true">
                <span>{label}</span>
                <span>wght {currentWeight}</span>
              </div>
              <div className="wsp-rule" aria-hidden="true" />
            </>
          )}

          {/* Giant Variable Font Weight Counter */}
          <p
            className="wsp-count"
            aria-hidden="true"
            style={{
              fontWeight: currentWeight,
              fontVariationSettings: `'wght' ${currentWeight}`,
              letterSpacing: `${wspTracking(currentWeight)}em`,
            }}
          >
            {displayCount}
          </p>

          {/* Bottom Foot & Tick Rail */}
          {hud && (
            <div className="wsp-foot" aria-hidden="true">
              <span>{caption}</span>
              <div className="wsp-rail">
                {Array.from({ length: TICK_COUNT + 1 }, (_, index) => (
                  <i
                    key={index}
                    className="wsp-tick"
                    data-major={index % 10 === 0}
                    data-on={index <= activeTicks}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sweeping Ink Panel with Italic Finish Line */}
          {message && (
            <div className="wsp-panel" aria-hidden={phase === 'load'}>
              <p className="wsp-line">{message}</p>
              {loop && (
                <span className="wsp-replay">Klik untuk mengulang</span>
              )}
            </div>
          )}

          {/* Screen Reader Support */}
          <span className="wsp-sr" aria-live="polite">
            {phase === 'load' ? '' : message || 'Loaded'}
          </span>
        </div>
      )}
    </div>
  );
}
