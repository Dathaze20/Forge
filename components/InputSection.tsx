import React from 'react';
import { Sentiment } from '../types';
import { ThumbsUp, ThumbsDown, Hexagon, Activity, Bolt } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputSectionProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  sentiment: Sentiment;
  onSentimentChange: (sentiment: Sentiment) => void;
}

import { motion } from 'motion/react';

export const InputSection = ({ value, onChange, onSubmit, isLoading, sentiment, onSentimentChange }: InputSectionProps) => {
  const bytes = new TextEncoder().encode(value).length;
  const isHighVolume = bytes > 500000;
  const isGiganticArchive = bytes > 2500000;

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
      <div className={cn(
        "flex-1 relative group rounded-[1.5rem] border min-h-0 focus-within:ring-2 ring-cyan-500/10 transition-all duration-700",
        isGiganticArchive 
          ? "bg-indigo-950/40 border-indigo-500/40 shadow-[0_0_30px_rgba(79,70,229,0.15)]" 
          : isHighVolume 
            ? "bg-cyan-950/20 border-cyan-500/30" 
            : "bg-[#0d1423]/80 border-white/[0.05]"
      )}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full h-full bg-transparent p-6 text-white font-mono text-xl leading-relaxed focus:outline-none transition-all custom-scrollbar resize-none pb-20",
            isGiganticArchive ? "placeholder:text-indigo-800" : "placeholder:text-slate-800"
          )}
          placeholder={isGiganticArchive ? "GIGANTIC ARCHIVE DETECTED // PREPARING HYPER-DENSITY ANALYTICS..." : "ENTER SUBJECT DATA FOR ANALYSIS..."}
        />
        
        {/* SMART PASTE BUTTON */}
        <button
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              onChange(text);
            } catch (err) {
              console.error('Failed to read clipboard', err);
            }
          }}
          className="absolute top-6 right-6 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all z-20"
        >
          SMART_PASTE
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
        whileHover={!isLoading && value.trim() ? { scale: 1.01 } : {}}
        whileTap={!isLoading && value.trim() ? { scale: 0.99 } : {}}
        type="button"
        onClick={onSubmit}
        disabled={isLoading || !value.trim()}
        className={cn(
          "w-full group h-24 rounded-[2rem] transition-all duration-500 border border-white/[0.08] overflow-hidden flex shrink-0 pointer-events-auto relative",
          isLoading ? "cursor-not-allowed border-cyan-500/50" : "bg-[#0d1423] hover:bg-[#121c33] hover:border-cyan-500/20 active:scale-[0.99]"
        )}
      >
        {isLoading && (
          <motion.div 
            initial={{ left: '-100%' }}
            animate={{ left: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent z-0"
          />
        )}
        
        <div className="w-24 bg-black/40 flex items-center justify-center shrink-0 border-r border-white/5 z-10">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-700",
            isLoading ? "border-cyan-500/50 bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "border-white/10 bg-white/5"
          )}>
            <Bolt className={cn("w-7 h-7", isLoading ? "text-cyan-400 animate-pulse" : "text-slate-700 group-hover:text-cyan-500")} />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-start justify-center px-8 text-left z-10">
          <span className="text-[10px] font-mono font-black text-slate-700 tracking-[0.4em] mb-1 uppercase group-hover:text-slate-500 transition-colors">INITIATE ARCHIVE FORGE</span>
          <h2 className={cn(
            "text-4xl font-[1000] italic uppercase tracking-tighter leading-none font-sans",
            isLoading ? "text-cyan-400 animate-pulse" : "text-white group-hover:text-cyan-400"
          )}>
            {isLoading ? 'FORGING...' : 'GENERATE'}
          </h2>
        </div>
      </motion.button>
    </div>
  );
};

