import React, { useState } from 'react';
import { Sentiment } from '../types';
import { ThumbsUp, ThumbsDown, Activity, Bolt } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch {}
}

interface InputSectionProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  sentiment: Sentiment;
  onSentimentChange: (sentiment: Sentiment) => void;
  hasKey: boolean;
  onOpenSettings: () => void;
}

import { motion } from 'motion/react';
import { KeyRound } from 'lucide-react';

export const InputSection = ({ value, onChange, onSubmit, sentiment, onSentimentChange, hasKey, onOpenSettings }: InputSectionProps) => {
  const bytes = new TextEncoder().encode(value).length;
  const isHighVolume = bytes > 500000;
  const isGiganticArchive = bytes > 2500000;
  const isReady = !!value.trim();
  const [pasteFailed, setPasteFailed] = useState(false);

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
      <div className={cn(
        "flex-1 relative group rounded-[1.5rem] border min-h-0 focus-within:ring-2 ring-cyan-500/10 transition-all duration-700 overflow-hidden",
        isGiganticArchive
          ? "bg-indigo-950/40 border-indigo-500/40 shadow-[0_0_30px_rgba(79,70,229,0.15)]"
          : isHighVolume
            ? "bg-cyan-950/20 border-cyan-500/30"
            : "bg-[#0d1423]/80 border-white/[0.05]"
      )}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none z-10" />
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full h-full bg-transparent p-6 text-white font-mono text-xl leading-relaxed focus:outline-none transition-all custom-scrollbar resize-none pb-20",
            isGiganticArchive ? "placeholder:text-indigo-800" : "placeholder:text-slate-800"
          )}
          placeholder={isGiganticArchive ? "GIGANTIC ARCHIVE DETECTED // PREPARING HYPER-DENSITY ANALYTICS..." : "ENTER SUBJECT DATA FOR ANALYSIS..."}
        />
        
        {!hasKey && (
          <button
            onClick={onOpenSettings}
            className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-[10px] font-black text-cyan-400 uppercase tracking-widest animate-pulse z-20"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Add API Key
          </button>
        )}

        {/* SMART PASTE BUTTON */}
        <button
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              if (!text) throw new Error('Clipboard empty');
              onChange(text);
              vibrate(15);
            } catch (err) {
              console.error('Failed to read clipboard', err);
              vibrate([50, 30, 50]);
              setPasteFailed(true);
              setTimeout(() => setPasteFailed(false), 1800);
            }
          }}
          className={cn(
            "absolute top-6 right-6 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all z-20",
            pasteFailed
              ? "bg-red-500/10 border-red-500/40 text-red-400"
              : "bg-white/5 border-white/10 text-slate-500 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/5"
          )}
        >
          {pasteFailed ? 'PASTE FAILED' : 'SMART_PASTE'}
        </button>

        <div className="absolute bottom-5 right-6 flex items-center gap-3 pointer-events-none">
           <Activity className={cn(
             "w-4 h-4 transition-all duration-500", 
             isGiganticArchive ? "text-indigo-400 animate-pulse" : value ? "text-cyan-400" : "text-slate-800"
           )} />
           <span className={cn(
             "text-[10px] font-mono font-black tracking-widest uppercase transition-all duration-500",
             isGiganticArchive ? "text-indigo-400" : value ? "text-cyan-400" : "text-slate-800"
           )}>
             {bytes.toLocaleString()} BYTES
           </span>
           {isGiganticArchive && (
             <span className="text-[8px] font-mono font-black text-indigo-500 animate-pulse bg-indigo-500/10 px-2 py-0.5 rounded ml-2">PLASMA_SURGE_ACTIVE</span>
           )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 h-32 shrink-0">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => onSentimentChange(Sentiment.FOR)}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-[1.5rem] border transition-all duration-300 pointer-events-auto",
            sentiment === Sentiment.FOR
              ? "border-cyan-400 bg-cyan-400/[0.05] text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
              : "bg-[#0d1423] border-white/[0.03] text-slate-600 hover:border-white/10"
          )}
        >
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300",
            sentiment === Sentiment.FOR ? "border-cyan-400/40 bg-cyan-400/20" : "border-white/5 bg-white/5"
          )}>
            <ThumbsUp className={cn("w-5 h-5", sentiment === Sentiment.FOR ? "text-cyan-400" : "text-slate-800")} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] font-sans">FOR IT</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => onSentimentChange(Sentiment.AGAINST)}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-[1.5rem] border transition-all duration-300 pointer-events-auto",
            sentiment === Sentiment.AGAINST
              ? "border-red-400/80 bg-red-400/[0.05] text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
              : "bg-[#0d1423] border-white/[0.03] text-slate-600 hover:border-white/10"
          )}
        >
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300",
            sentiment === Sentiment.AGAINST ? "border-red-400/40 bg-red-400/20" : "border-white/5 bg-white/5"
          )}>
            <ThumbsDown className={cn("w-5 h-5", sentiment === Sentiment.AGAINST ? "text-red-400" : "text-slate-800")} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] font-sans">AGAINST</span>
        </motion.button>
      </div>

      <motion.button
        whileHover={isReady ? { scale: 1.01 } : {}}
        whileTap={isReady ? { scale: 0.99 } : {}}
        type="button"
        onClick={onSubmit}
        disabled={!isReady}
        className={cn(
          "w-full group h-24 rounded-[2rem] transition-all duration-500 overflow-hidden flex shrink-0 pointer-events-auto relative active:scale-[0.99]",
          isReady
            ? "border border-cyan-300/40 bg-gradient-to-r from-cyan-500 via-cyan-400 to-indigo-500 shadow-[0_0_40px_rgba(6,182,212,0.35)]"
            : "border border-white/[0.08] bg-[#0d1423] hover:bg-[#121c33] hover:border-cyan-500/20"
        )}
      >
        {isReady && (
          <motion.div
            animate={{ x: ['-120%', '220%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none"
          />
        )}
        <div className={cn(
          "w-20 flex items-center justify-center shrink-0 border-r z-10 transition-colors duration-500",
          isReady ? "bg-black/10 border-white/10" : "bg-black/40 border-white/5"
        )}>
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-500",
            isReady ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"
          )}>
            <Bolt className={cn("w-6 h-6 transition-colors", isReady ? "text-white" : "text-slate-700 group-hover:text-cyan-500")} />
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col items-start justify-center px-5 text-left z-10">
          <span className={cn(
            "text-[9px] font-mono font-black tracking-[0.15em] mb-1 uppercase transition-colors truncate max-w-full",
            isReady ? "text-black/50" : "text-slate-700 group-hover:text-slate-500"
          )}>INITIATE ARCHIVE FORGE</span>
          <h2 className={cn(
            "text-3xl font-[1000] italic uppercase tracking-tighter leading-none font-sans truncate max-w-full pr-1 transition-colors",
            isReady ? "text-black" : "text-white group-hover:text-cyan-400"
          )}>
            GENERATE
          </h2>
        </div>
      </motion.button>
    </div>
  );
};

