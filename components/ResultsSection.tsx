import { motion, AnimatePresence } from 'motion/react';
import { GroundingSource } from '../types';
import { ExternalLink, RotateCcw, Activity, Play as Youtube, Share2, FileText, ChevronRight, CornerDownRight } from 'lucide-react';
import { CopyButton } from './CopyButton';
import React, { forwardRef, useMemo, useState } from 'react';

interface ResultsSectionProps {
  content: string;
  thought?: string;
  youtubeMetadata?: { title: string; description: string; tags: string; };
  mediumMetadata?: { tags: string[]; };
  sources: GroundingSource[];
  onNew: () => void;
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ResultsSection = forwardRef<HTMLDivElement, ResultsSectionProps>(({ content, thought, youtubeMetadata, mediumMetadata, sources, onNew }, ref) => {
  const wordCount = useMemo(() => content.split(/\s+/).filter(Boolean).length, [content]);
  const [showThought, setShowThought] = useState(false);

  const parseContent = (text: string) => {
    // Remove metadata blocks from the main text display
    const cleanText = text
      .replace(/\[YT_METADATA\][\s\S]*?\[\/YT_METADATA\]/g, '')
      .replace(/\[MEDIUM_TAGS\][\s\S]*?\[\/MEDIUM_TAGS\]/g, '')
      .trim();

    const lines = cleanText.split('\n');
    let isTitle = true;
    let isSubtitle = false;

    return lines.map((line, i) => {
      let trimmedLine = line.trim();
      if (!trimmedLine) return <div key={i} className="h-6" />;
      
      const isHeader = trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5 && !trimmedLine.includes('HTTPS') && !trimmedLine.includes('.');
      
      if (isTitle) {
        isTitle = false;
        isSubtitle = true;
        return (
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={i} 
            className="text-4xl sm:text-7xl font-[1000] uppercase tracking-tighter mb-8 text-white leading-[0.9] italic"
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
            className="flex items-start gap-4 mb-24"
          >
            <CornerDownRight className="w-8 h-8 text-cyan-500 shrink-0 mt-1" />
            <p className="text-xl sm:text-4xl font-medium text-slate-200 italic leading-tight max-w-2xl">
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
            className="text-2xl sm:text-4xl font-black uppercase tracking-tight mt-32 mb-12 text-white border-b-2 border-white/10 pb-6 flex items-center justify-between group"
          >
            <span>{trimmedLine}</span>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono font-bold text-cyan-500 tracking-[0.5em] opacity-30 group-hover:opacity-100 transition-opacity uppercase">ARCHIVE_SEC_${i}</span>
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
    <div ref={ref} className="flex flex-col gap-10 pb-32">
      {/* STATS HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5 glass-input rounded-[2.5rem] border border-white/5">
        {[
          { label: 'WORD DENSITY', value: wordCount.toLocaleString(), color: 'text-white' },
          { label: 'READ LATENCY', value: `${Math.ceil(wordCount / 200)}m`, color: 'text-white' },
          { label: 'NEURAL NODES', value: (sources.length || 12).toString(), color: 'text-cyan-400' },
          { label: 'SCALE RATIO', value: '1:10', color: 'text-indigo-400' },
        ].map((stat, i) => (
          <div key={i} className="flex flex-col px-5 py-3 rounded-[2rem] bg-white/[0.02] border border-white/[0.03]">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</span>
            <span className={`text-xl font-black ${stat.color} tracking-tight italic`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* ACTION BAR */}
      <div className="flex items-center justify-between px-4">
        <button 
          onClick={onNew}
          className="flex items-center gap-3 px-6 py-3 rounded-full bg-slate-900 border border-white/10 text-xs font-black text-slate-400 uppercase tracking-widest hover:border-cyan-500/50 hover:text-cyan-400 transition-all active:scale-95 group"
        >
          <RotateCcw className="w-4 h-4 group-hover:rotate-[-90deg] transition-transform" />
          NEW FORGE
        </button>
        <div className="flex items-center gap-2">
          <CopyButton content={content} />
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-900 border border-white/10 text-slate-500 hover:text-white hover:border-white/30 transition-all">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ARTICLE BODY */}
      <motion.article 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-input p-8 sm:p-20 rounded-[3.5rem] border border-white/10 relative overflow-hidden shadow-2xl bg-[#0a0f1d]"
      >
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-12 right-12 opacity-5 pointer-events-none select-none">
          <Activity className="w-24 h-24 text-white" />
        </div>
        
        <div className="max-w-3xl mx-auto relative z-10">
          {parseContent(content)}
        </div>

        {/* BOTTOM COPY BUTTON FOR BLOG ASSET */}
        <div className="mt-24 flex justify-center sticky bottom-0 pb-12 pt-6 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/90 to-transparent z-20">
          <div className="p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
            <CopyButton content={content} label="SECURE FORGED ASSET" />
          </div>
        </div>

        {/* DOSSIER FOOTER */}
        <div className="mt-12 pt-16 border-t font-mono border-white/5 flex flex-col sm:flex-row items-center justify-between gap-8 opacity-40">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-bold">AA</div>
             <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-widest">Abel Arroyo</span>
               <span className="text-[9px] uppercase tracking-widest">Chief Cultural Biographer</span>
             </div>
           </div>
           <div className="text-[9px] uppercase tracking-[0.4em] font-black">GOLDEN GEMS ARCHIVES // 2026</div>
        </div>
      </motion.article>

      {/* THE VAULT: METADATA EXPORT */}
      <div className="grid grid-cols-1 gap-6">
        {/* YOUTUBE METADATA */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-input p-8 rounded-[2.5rem] border border-white/10 bg-black/20"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Youtube className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">YouTube Optimization Matrix</h3>
            </div>
            <CopyButton 
              content={`${youtubeMetadata?.title || ''}\n\n${youtubeMetadata?.description || ''}`} 
              label="COPY YT PACK"
            />
          </div>
          
          <div className="space-y-6">
            <div>
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-2">NEURAL TITLE</span>
              <p className="text-sm font-bold text-white tracking-tight leading-relaxed">{youtubeMetadata?.title || 'TITLING PENDING...'}</p>
            </div>
            <div>
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-2">FORENSIC DESCRIPTION</span>
              <p className="text-[10px] font-mono text-slate-500 leading-relaxed whitespace-pre-wrap line-clamp-4">
                {youtubeMetadata?.description || 'GENERATING OPTIMIZED METADATA...'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* MEDIUM METADATA */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-input p-8 rounded-[2.5rem] border border-white/10 bg-black/20"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Curation Optimization</h3>
            </div>
            <CopyButton content={mediumMetadata?.tags?.join(', ') || ''} label="COPY TAGS" />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(mediumMetadata?.tags || ['CURATION', 'CULTURE', 'FORGE', 'ANALYSIS', 'BIOGRAPHY']).map((tag, i) => (
              <span key={i} className="px-4 py-1.5 rounded-full bg-slate-900 border border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:border-cyan-500/30 transition-colors">
                #{tag}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* FORENSIC ANALYSIS (THOUGHT) */}
      <AnimatePresence>
        {thought && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-input p-8 rounded-[3rem] border border-white/10 overflow-hidden bg-slate-950/20"
          >
            <button 
              onClick={() => setShowThought(!showThought)}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center gap-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex flex-col items-start">
                  <h3 className="text-[10px] font-black text-slate-100 uppercase tracking-[0.4em]">NEURAL PROCESS LOGS</h3>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">INTERNAL REASONING ACTIVE</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest group-hover:underline decoration-2 underline-offset-4">
                  {showThought ? 'CONCEAL' : 'REVEAL'}
                </span>
                <ChevronRight className={cn("w-4 h-4 text-indigo-500 transition-transform duration-300", showThought && "rotate-90")} />
              </div>
            </button>
            
            {showThought && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-8 pt-8 border-t border-white/10 text-sm font-mono text-slate-400 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar italic"
              >
                {thought}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

