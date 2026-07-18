import { motion } from 'motion/react';
import { GroundingSource } from '../types';
import { RotateCcw, Activity, CornerDownRight } from 'lucide-react';
import { CopyButton } from './CopyButton';
import React, { forwardRef, useMemo } from 'react';

interface ResultsSectionProps {
  content: string;
  sources: GroundingSource[];
  onNew: () => void;
}

const SECTION_HEADERS = new Set([
  'THE ORIGIN STORY',
  'THE TURNING POINT',
  'THE BODY OF WORK',
  'THE TRAGEDY',
  'THE LEGACY AND THE VAULT',
]);

export const ResultsSection = forwardRef<HTMLDivElement, ResultsSectionProps>(({ content, sources, onNew }, ref) => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const wordCount = useMemo(() => content.split(/\s+/).filter(Boolean).length, [content]);

  const parseContent = (text: string) => {
    const lines = text.split('\n');
    let isTitle = true;
    let isSubtitle = false;

    return lines.map((line, i) => {
      let trimmedLine = line.trim();
      if (!trimmedLine) return <div key={i} className="h-6" />;

      const isHeader = SECTION_HEADERS.has(trimmedLine);

      if (isTitle) {
        isTitle = false;
        isSubtitle = true;
        return (
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={i}
            className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3 text-white leading-[1.1]"
          >
            {trimmedLine}
          </motion.h1>
        );
      }

      if (isSubtitle) {
        isSubtitle = false;
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            key={i}
            className="flex items-start gap-3 mb-10"
          >
            <CornerDownRight className="w-5 h-5 text-cyan-500 shrink-0 mt-1" />
            <p className="text-base sm:text-xl font-medium text-slate-300 leading-snug max-w-2xl">
              {trimmedLine}
            </p>
          </motion.div>
        );
      }

      if (isHeader) {
        return (
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            key={i}
            className="text-2xl sm:text-4xl font-black uppercase tracking-tight mt-32 mb-12 text-white border-b-2 border-white/10 pb-6 flex items-center justify-between gap-4 group"
          >
            <span className="min-w-0">{trimmedLine}</span>
            {/* Decorative flourish only - hidden below sm since a long header title already
                needs all the room on a phone-width viewport */}
            <div className="hidden sm:flex items-center gap-4 shrink-0">
              <span className="text-[10px] font-mono font-bold text-cyan-500 tracking-[0.15em] opacity-30 group-hover:opacity-100 transition-opacity uppercase">ARCHIVE_SEC_{i}</span>
              <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.h2>
        );
      }

      return (
        <p key={i} className="text-lg sm:text-xl text-slate-400 leading-relaxed mb-10 font-medium font-sans selection:bg-cyan-500/30">
          {trimmedLine}
        </p>
      );
    });
  };

  return (
    <div ref={ref} className="flex flex-col h-full min-h-0">
      {/* STATS HUD - always visible, never scrolls away */}
      <div className="shrink-0 flex flex-col gap-2 pb-3">
        <div className="grid grid-cols-4 gap-1.5 p-1.5 glass-input rounded-2xl border border-white/5">
          {[
            { label: 'WORD DENSITY', value: wordCount.toLocaleString(), color: 'text-white' },
            { label: 'READ LATENCY', value: `${Math.ceil(wordCount / 265)}m`, color: 'text-white' },
            { label: 'NEURAL NODES', value: (sources.length || 12).toString(), color: 'text-cyan-400' },
            { label: 'TARGET DENSITY', value: `${Math.round((wordCount / 4750) * 100)}%`, color: 'text-indigo-400' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center px-1 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.03]">
              <span className="text-[6px] font-black text-slate-500 uppercase tracking-wider mb-0.5 text-center leading-tight">{stat.label}</span>
              <span className={`text-xs font-black ${stat.color} tracking-tight`}>{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-1 gap-2">
          <button
            onClick={onNew}
            aria-label="Start a new article"
            title="Start a new article"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-900 border border-white/10 text-slate-500 hover:text-white hover:border-white/30 transition-all active:scale-95 group shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-90deg] transition-transform" />
          </button>
          <CopyButton content={content} label="COPY ARTICLE" />
        </div>
      </div>

      {/* ARTICLE - the only view, the only thing that scrolls */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-32">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-input p-6 sm:p-16 rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl bg-[#0a0f1d]"
        >
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
          <div className="absolute top-12 right-12 opacity-5 pointer-events-none select-none">
            <Activity className="w-24 h-24 text-white" />
          </div>

          <div className="max-w-3xl mx-auto relative z-10">
            {parseContent(content)}
          </div>

          <div className="mt-24 pt-16 border-t font-mono border-white/5 flex flex-col sm:flex-row items-center justify-between gap-8 opacity-40">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-white/20 overflow-hidden shrink-0">
                <img src="./icons/abel-arroyo.webp" alt="Abel Arroyo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest">Abel Arroyo</span>
                <span className="text-[9px] uppercase tracking-widest">Chief Cultural Biographer</span>
              </div>
            </div>
            <div className="text-[9px] uppercase tracking-[0.15em] font-black">GOLDEN GEMS ARCHIVES // {currentYear}</div>
          </div>
        </motion.article>
      </div>
    </div>
  );
});
