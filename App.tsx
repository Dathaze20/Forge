import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sentiment, AppState } from './types';
import { generateBlogPost } from './services/geminiService';
import { Logo } from './components/Logo';
import { InputSection } from './components/InputSection';
import { ResultsSection } from './components/ResultsSection';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MessageSquare } from 'lucide-react';

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

  const [youtubeMetadata, setYoutubeMetadata] = useState<{ title: string; description: string; tags: string } | undefined>();
  const [mediumMetadata, setMediumMetadata] = useState<{ tags: string[] } | undefined>();

  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

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

  const parseMetadata = (content: string) => {
    // Parse YouTube Metadata
    const ytMatch = content.match(/\[YT_METADATA\]([\s\S]*?)\[\/YT_METADATA\]/);
    if (ytMatch) {
      const ytLines = ytMatch[1].trim().split('\n');
      const title = ytLines.find(l => l.startsWith('TITLE:'))?.replace('TITLE:', '').trim() || '';
      const description = ytLines.find(l => l.startsWith('DESCRIPTION:'))?.replace('DESCRIPTION:', '').trim() || '';
      const beats = ytLines.find(l => l.startsWith('BEATS:'))?.replace('BEATS:', '').trim() || '';
      setYoutubeMetadata({ title, description, tags: beats });
    }

    // Parse Medium Tags
    const mediumMatch = content.match(/\[MEDIUM_TAGS\]([\s\S]*?)\[\/MEDIUM_TAGS\]/);
    if (mediumMatch) {
       const tags = mediumMatch[1].trim().split('\n').filter(Boolean).map(t => t.replace(/^#/, '').trim());
       setMediumMetadata({ tags });
    }
  };

  const handleGenerate = async () => {
    console.log("Handle generate called. Notes length:", notes.trim().length);
    if (!notes.trim()) return;

    vibrate(30);
    setAppState(AppState.GENERATING);
    setResult('');
    setThought('');
    setYoutubeMetadata(undefined);
    setMediumMetadata(undefined);
    setError(null);

    try {
      await generateBlogPost(
        notes,
        sentiment,
        (update) => {
          if (update.content) {
            setResult(update.content);
            parseMetadata(update.content);
          }
          if (update.thought) setThought(update.thought);
          if (update.isComplete) {
            setAppState(AppState.COMPLETE);
            vibrate([40, 60, 40, 60, 80]);
          }
        }
      );
      
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error("Generation error:", err);
      vibrate([100, 50, 100]);
      let userMessage = "NEURAL FORGE COLLAPSE: ANOMALY DETECTED.";
      
      try {
        // Handle Gemini 429 quota specifically
        if (err.message && (err.message.includes("429") || err.message.includes("quota"))) {
          userMessage = "QUOTA EXHAUSTED: THE SYSTEM IS COOLING DOWN. PLEASE WAIT 60 SECONDS BEFORE RE-FORGING.";
        } else if (err instanceof Error) {
          userMessage = `SYSTEM ERROR: ${err.message.toUpperCase()}`;
        }
      } catch (pErr) {
        userMessage = `FORGE FAILURE: ${err.message || 'UNKNOWN ERROR'}`;
      }
      
      setError(userMessage);
      setAppState(AppState.IDLE);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col p-4 sm:p-6 max-w-lg mx-auto selection:bg-cyan-500 selection:text-white overflow-hidden bg-[#050a14] relative">
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
        <a
          href="https://github.com/Dathaze20/Forge/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          className="w-11 h-11 flex flex-col items-center justify-center glass-input rounded-xl border border-white/10 hover:border-cyan-500/50 active:scale-95 transition-all"
          aria-label="Send feedback"
          title="Send feedback"
        >
          <MessageSquare className="w-5 h-5 text-slate-500" />
        </a>
      </header>

      <main className="w-full flex-1 flex flex-col overflow-hidden relative min-h-0 z-10">
        <div className={cn(
          "flex-1 flex flex-col transition-all duration-700 ease-in-out",
          appState === AppState.COMPLETE ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
        )}>
          <div className="flex-1 flex flex-col min-h-0">
              <InputSection 
                value={notes}
                onChange={setNotes}
                onSubmit={handleGenerate}
                isLoading={appState === AppState.GENERATING}
                sentiment={sentiment}
                onSentimentChange={handleSentimentChange}
              />
          </div>
        </div>

        <div className={cn(
          "absolute inset-0 transition-all duration-700 ease-in-out px-1",
          appState === AppState.COMPLETE ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        )}>
          <div className="h-full overflow-y-auto custom-scrollbar pt-2" ref={resultsRef}>
            <ResultsSection 
              content={result} 
              thought={thought}
              youtubeMetadata={youtubeMetadata}
              mediumMetadata={mediumMetadata}
              sources={[]}
              onNew={() => {
                vibrate(15);
                setAppState(AppState.IDLE);
                setNotes('');
                setResult('');
                setThought('');
                setYoutubeMetadata(undefined);
                setMediumMetadata(undefined);
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

      <footer className="mt-4 flex justify-center items-center gap-3 shrink-0 pb-1 z-20 safe-pb">
        <div className="h-1 w-20 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]" />
        <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
        <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
      </footer>
    </div>
  );
}
