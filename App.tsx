import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sentiment, AppState, GroundingSource } from './types';
import { generateBlogPost, GenerationCancelledError } from './services/geminiService';
import { getApiKey } from './lib/apiKey';
import { Logo } from './components/Logo';
import { InputSection } from './components/InputSection';
import { GeneratingView } from './components/GeneratingView';
import { ResultsSection } from './components/ResultsSection';
import { SettingsPanel } from './components/SettingsPanel';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { KeyRound } from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch {}
}

export default function App() {
  const [notes, setNotes] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment>(Sentiment.FOR);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<string>('');
  const [thought, setThought] = useState<string>('');
  const [sources, setSources] = useState<GroundingSource[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [hasKey, setHasKey] = useState(() => !!getApiKey());
  const resultsRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Identifies which generateBlogPost call is "current". Every callback and
  // catch block below checks its captured id against this ref before acting,
  // so a stale request - whether cancelled or just superseded by a newer one
  // started before it finished - can never update state, show an error, or
  // overwrite a newer generation's result.
  const requestIdRef = useRef(0);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    setHasKey(!!getApiKey());
  }, []);

  // If this component instance is ever torn down with a generation still in
  // flight (StrictMode's dev double-mount, or future routing), abort it -
  // otherwise a late callback captured by the old closure could still fire
  // with no instance left to safely ignore it via the request-id guard.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Auto-dismiss the error toast so it doesn't linger forever if the user ignores it
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  // Keep the screen on while a generation is streaming (long-form output takes a while)
  useEffect(() => {
    const acquire = async () => {
      if (appState !== AppState.GENERATING || !('wakeLock' in navigator)) return;
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {}
    };
    const release = () => {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };

    if (appState === AppState.GENERATING) {
      acquire();
      const onVisibility = async () => {
        if (document.visibilityState === 'visible' && appState === AppState.GENERATING) {
          await acquire();
        }
      };
      document.addEventListener('visibilitychange', onVisibility);
      return () => {
        document.removeEventListener('visibilitychange', onVisibility);
        release();
      };
    }
    release();
  }, [appState]);

  const handleSentimentChange = useCallback((next: Sentiment) => {
    vibrate(15);
    setSentiment(next);
  }, []);

  const handleGenerate = async () => {
    if (!notes.trim()) return;

    if (!getApiKey()) {
      vibrate([50, 30, 50]);
      setShowSettings(true);
      return;
    }

    // Cancel and discard any generation already in flight before starting a
    // new one, and mint a fresh id for this one so stale callbacks from the
    // old request (or from this one, if it gets cancelled) are ignored below.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++requestIdRef.current;

    vibrate(30);
    setAppState(AppState.GENERATING);
    setResult('');
    setThought('');
    setSources([]);
    setError(null);

    try {
      await generateBlogPost(
        notes,
        sentiment,
        (update) => {
          if (requestId !== requestIdRef.current) return;
          if (update.content) {
            setResult(update.content);
          }
          if (update.thought) setThought(update.thought);
          if (update.sources) setSources(update.sources);
          if (update.isComplete) {
            setAppState(AppState.COMPLETE);
            vibrate([40, 60, 40, 60, 80]);
          }
        },
        controller.signal
      );

      // Re-check at fire time, not just at schedule time - a newer generation
      // (or a cancellation) can start in the 100ms between scheduling this
      // and it actually running, and this request's id would still have
      // matched at the point it was scheduled.
      setTimeout(() => {
        if (requestId === requestIdRef.current) {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: any) {
      // Either a newer generation has already taken over, or this one was
      // cancelled on purpose - neither is a failure worth reporting.
      if (requestId !== requestIdRef.current || err instanceof GenerationCancelledError) {
        return;
      }
      console.error("Generation error:", err);
      vibrate([100, 50, 100]);
      let userMessage = "NEURAL FORGE COLLAPSE: ANOMALY DETECTED.";

      try {
        // geminiService already crafts a specific, detailed message for every
        // failure case (invalid key, quota exhausted, timeout, etc.) - show
        // it as-is instead of replacing it with a vague canned phrase that
        // was hiding the actual reason.
        if (err instanceof Error && err.message) {
          userMessage = `SYSTEM ERROR: ${err.message.toUpperCase()}`;
        }
      } catch (pErr) {
        userMessage = `FORGE FAILURE: ${err.message || 'UNKNOWN ERROR'}`;
      }

      setError(userMessage);
      setAppState(AppState.IDLE);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    // Invalidate this generation's id immediately so its own pending
    // callbacks and catch block are ignored the instant they arrive, without
    // waiting for the abort to actually propagate through the network.
    requestIdRef.current++;
    vibrate(30);
    setAppState(AppState.IDLE);
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col p-4 sm:p-6 max-w-lg mx-auto selection:bg-cyan-500 selection:text-white overflow-hidden bg-[#050a14] relative safe-pb">
      {/* SCANNER BACKGROUND EFFECT */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#888_1px,transparent_1px),linear-gradient(to_bottom,#888_1px,transparent_1px)] bg-[size:40px_40px]" />
        <motion.div 
          animate={{ top: ['-10%', '110%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 w-full h-[20%] bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-20"
        />
      </div>

      <header className="mb-4 flex justify-between items-center shrink-0 z-10 relative safe-pt">
        <Logo />
        <button
          onClick={() => setShowSettings(true)}
          className={cn(
            "w-11 h-11 flex flex-col items-center justify-center glass-input rounded-xl border transition-all active:scale-95 shrink-0",
            hasKey ? "border-white/10 hover:border-cyan-500/50" : "border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          )}
          aria-label="Gemini API key settings"
          title="Gemini API key settings"
        >
          <KeyRound className={cn("w-5 h-5", hasKey ? "text-slate-500" : "text-cyan-400")} />
        </button>
      </header>

      <main className="w-full flex-1 flex flex-col overflow-hidden relative min-h-0 z-10">
        <div className={cn(
          "flex-1 flex flex-col transition-opacity duration-500 ease-in-out",
          appState === AppState.COMPLETE ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
          <div className="flex-1 flex flex-col min-h-0">
            {appState === AppState.GENERATING ? (
              <GeneratingView content={result} thought={thought} onCancel={handleCancel} />
            ) : (
              <InputSection
                value={notes}
                onChange={setNotes}
                onSubmit={handleGenerate}
                sentiment={sentiment}
                onSentimentChange={handleSentimentChange}
                hasKey={hasKey}
                onOpenSettings={() => setShowSettings(true)}
              />
            )}
          </div>
        </div>

        <div className={cn(
          "absolute inset-0 transition-opacity duration-500 ease-in-out px-1",
          appState === AppState.COMPLETE ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <div className="h-full overflow-y-auto custom-scrollbar pt-2" ref={resultsRef}>
            <ResultsSection
              content={result}
              sources={sources}
              onNew={() => {
                vibrate(15);
                setAppState(AppState.IDLE);
                setNotes('');
                setResult('');
                setThought('');
                setSources([]);
              }}
            />
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 10, x: '-50%' }}
              className="absolute bottom-4 left-1/2 w-full max-w-[90%] z-50 px-4"
            >
              <div className="glass-input p-5 rounded-[2.5rem] border border-red-500/30 flex items-center gap-4 bg-red-950/40 backdrop-blur-xl shadow-2xl shadow-red-500/20">
                <div className="w-2.5 h-2.5 shrink-0 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/90 leading-tight flex-1">{error}</p>
                <button 
                  onClick={() => setError(null)} 
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/20 text-red-400 transition-colors"
                >
                  <span className="text-xl leading-none">×</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <SettingsPanel open={showSettings} onClose={closeSettings} />
    </div>
  );
}
