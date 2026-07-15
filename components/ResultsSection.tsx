import { motion, AnimatePresence } from 'motion/react';
import { GroundingSource } from '../types';
import { ExternalLink, RotateCcw, Activity, Play as Youtube, Share2, CornerDownRight, Newspaper, Tags, Terminal } from 'lucide-react';
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

type Tab = 'article' | 'seo' | 'process';

const SECTION_HEADERS = new Set([
  'THE ORIGIN STORY',
  'THE TURNING POINT',
  'THE BODY OF WORK',
  'THE TRAGEDY',
  'THE LEGACY AND THE VAULT',
]);

const stripMetadataBlocks = (text: string) => text
  .replace(/\[YT_METADATA\][\s\S]*?\[\/YT_METADATA\]/g, '')
  .replace(/\[MEDIUM_TAGS\][\s\S]*?\[\/MEDIUM_TAGS\]/g, '')
  .trim();

export const ResultsSection = forwardRef<HTMLDivElement, ResultsSectionProps>(({ content, thought, youtubeMetadata, mediumMetadata, sources, onNew }, ref) => {
  const wordCount = useMemo(() => content.split(/\s+/).filter(Boolean).length, [content]);
  const cleanContent = useMemo(() => stripMetadataBlocks(content), [content]);
  const [tab, setTab] = useState<Tab>('article');

  const handleShare = async () => {
    const title = cleanContent.split('\n').find((l) => l.trim())?.trim() || 'PostPilot Article';
    if (navigator.share) {
      try {
        await navigator.share({ title, text: cleanContent });
      } catch {
        // User cancelled the share sheet - not an error worth surfacing
      }
    } else {
      await navigator.clipboard.writeText(cleanContent).catch(() => {});
    }
  };

  const parseContent = (text: string) => {
    const cleanText = stripMetadataBlocks(text);

    const lines = cleanText.split('\n');
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'article', label: 'Article', icon: <Newspaper className="w-3.5 h-3.5" /> },
    { id: 'seo', label: 'SEO', icon: <Tags className="w-3.5 h-3.5" /> },
    { id: 'process', label: 'Process', icon: <Terminal className="w-3.5 h-3.5" /> },
  ];

  return (
    <div ref={ref} className="flex flex-col h-full min-h-0">
      {/* STATS HUD - always visible, never scrolls away */}
      <div className="shrink-0 flex flex-col gap-3 pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 glass-input rounded-[1.75rem] border border-white/5">
          {[
            { label: 'WORD DENSITY', value: wordCount.toLocaleString(), color: 'text-white' },
            { label: 'READ LATENCY', value: `${Math.ceil(wordCount / 200)}m`, color: 'text-white' },
            { label: 'NEURAL NODES', value: (sources.length || 12).toString(), color: 'text-cyan-400' },
            { label: 'TARGET DENSITY', value: `${Math.round((wordCount / 4750) * 100)}%`, color: 'text-indigo-400' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{stat.label}</span>
              <span className={`text-base font-black ${stat.color} tracking-tight italic`}>{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-1 gap-2">
          <button
            onClick={onNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-cyan-500/50 hover:text-cyan-400 transition-all active:scale-95 group"
          >
            <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-90deg] transition-transform" />
            New
          </button>
          <div className="flex items-center gap-2">
            <CopyButton content={cleanContent} />
            <button
              onClick={handleShare}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-900 border border-white/10 text-slate-500 hover:text-white hover:border-white/30 transition-all active:scale-95"
              aria-label="Share article"
              title="Share article"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 p-1 glass-input rounded-2xl border border-white/5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                tab === t.id ? "bg-cyan-500/10 border border-cyan-500/40 text-cyan-400" : "border border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT - the only part that scrolls */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-32">
        {tab === 'article' && (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
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

            <div className="mt-24 flex justify-center sticky bottom-0 pb-12 pt-6 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/90 to-transparent z-20">
              <div className="p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
                <CopyButton content={cleanContent} label="SECURE FORGED ASSET" />
              </div>
            </div>

            <div className="mt-12 pt-16 border-t font-mono border-white/5 flex flex-col sm:flex-row items-center justify-between gap-8 opacity-40">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-bold">AA</div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest">Abel Arroyo</span>
                  <span className="text-[9px] uppercase tracking-widest">Chief Cultural Biographer</span>
                </div>
              </div>
              <div className="text-[9px] uppercase tracking-[0.15em] font-black">GOLDEN GEMS ARCHIVES // 2026</div>
            </div>
          </motion.article>
        )}

        {tab === 'seo' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-4"
          >
            <div className="glass-input p-6 rounded-[2.5rem] border border-white/10 bg-black/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <Youtube className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] truncate">YouTube Matrix</h3>
                </div>
                <CopyButton
                  content={`${youtubeMetadata?.title || ''}\n\n${youtubeMetadata?.description || ''}`}
                  label="COPY"
                />
              </div>

              <div className="space-y-5">
                <div>
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-2">NEURAL TITLE</span>
                  <p className="text-sm font-bold text-white tracking-tight leading-relaxed">{youtubeMetadata?.title || 'TITLING PENDING...'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-2">FORENSIC DESCRIPTION</span>
                  <p className="text-[10px] font-mono text-slate-500 leading-relaxed whitespace-pre-wrap">
                    {youtubeMetadata?.description || 'GENERATING OPTIMIZED METADATA...'}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-input p-6 rounded-[2.5rem] border border-white/10 bg-black/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <Share2 className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] truncate">Curation Tags</h3>
                </div>
                <CopyButton content={mediumMetadata?.tags?.join(', ') || ''} label="COPY" />
              </div>

              <div className="flex flex-wrap gap-2">
                {(mediumMetadata?.tags || ['CURATION', 'CULTURE', 'FORGE', 'ANALYSIS', 'BIOGRAPHY']).map((tag, i) => (
                  <span key={i} className="px-4 py-1.5 rounded-full bg-slate-900 border border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:border-cyan-500/30 transition-colors">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'process' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="glass-input p-6 rounded-[2.5rem] border border-white/10 bg-slate-950/20">
              <div className="flex items-center gap-4 mb-6 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-[10px] font-black text-slate-100 uppercase tracking-[0.15em] truncate">NEURAL PROCESS LOGS</h3>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest truncate">INTERNAL REASONING</span>
                </div>
              </div>
              <div className="text-sm font-mono text-slate-400 leading-relaxed whitespace-pre-wrap italic">
                {thought || 'No process log for this generation yet.'}
              </div>
            </div>

            <div className="glass-input p-6 rounded-[2.5rem] border border-white/10 bg-black/20">
              <div className="flex items-center gap-4 mb-6 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-[10px] font-black text-slate-100 uppercase tracking-[0.15em] truncate">Live Search Sources</h3>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest truncate">{sources.length} verified {sources.length === 1 ? 'record' : 'records'}</span>
                </div>
              </div>

              {sources.length > 0 ? (
                <div className="space-y-2">
                  {sources.map((source, i) => (
                    <a
                      key={i}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/30 transition-colors group"
                    >
                      <span className="text-[9px] font-mono font-black text-slate-600 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-xs text-slate-400 group-hover:text-emerald-400 truncate flex-1 transition-colors">{source.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-700 group-hover:text-emerald-400 shrink-0 transition-colors" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">No grounded sources were returned for this generation.</p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
});
