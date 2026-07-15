import React, { useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Zap } from 'lucide-react';

interface GeneratingViewProps {
  content: string;
  thought: string;
  onCancel: () => void;
}

const TARGET_WORDS = 4750;
const PREVIEW_CHARS = 900;

export const GeneratingView = ({ content, thought, onCancel }: GeneratingViewProps) => {
  const wordCount = useMemo(() => content.split(/\s+/).filter(Boolean).length, [content]);
  const progress = Math.min(99, Math.round((wordCount / TARGET_WORDS) * 100));
  const preview = content.length > PREVIEW_CHARS ? content.slice(-PREVIEW_CHARS) : content;
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    previewRef.current?.scrollTo({ top: previewRef.current.scrollHeight });
  }, [preview]);

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0 py-2">
      <div className="flex-1 min-h-0 rounded-[1.75rem] border border-cyan-500/20 bg-black/60 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/5 z-10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <span className="text-[9px] font-mono font-black text-cyan-400 uppercase tracking-[0.3em]">Live Synthesis</span>
          </div>
          <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest">{wordCount.toLocaleString()} words</span>
        </div>

        <div
          ref={previewRef}
          className="absolute inset-0 pt-11 pb-4 px-4 overflow-y-auto custom-scrollbar"
        >
          <p className="text-[13px] font-mono text-cyan-300/80 leading-relaxed whitespace-pre-wrap break-words">
            {preview || 'Connecting to the forge...'}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="inline-block w-2 h-4 bg-cyan-400 ml-0.5 translate-y-0.5"
            />
          </p>
        </div>
      </div>

      <div className="shrink-0 space-y-3">
        <div className="flex justify-between items-baseline">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">Forging...</h3>
            <p className="text-xs text-slate-500 uppercase tracking-widest truncate">{thought || 'Initializing...'}</p>
          </div>
          <span className="text-2xl font-bold text-cyan-400 tabular-nums shrink-0 ml-3">{progress}%</span>
        </div>

        <div
          className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Generation progress"
        >
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-[10px] text-slate-600 text-center uppercase tracking-widest flex items-center justify-center gap-1.5">
          <Zap className="w-3 h-3" />
          Keep this tab open &middot; Screen will stay on
        </p>

        <button
          onClick={onCancel}
          className="w-full py-3 text-slate-400 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform rounded-xl border border-slate-700/50 focus-visible:outline-2 focus-visible:outline-cyan-500"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
};
