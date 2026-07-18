import React, { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch {}
}

interface CopyButtonProps {
  content: string;
  label?: string;
}

export const CopyButton = ({ content, label }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      vibrate(15);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      vibrate([50, 30, 50]);
    }
  };

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? 'Copied to clipboard' : label ? `Copy ${label.toLowerCase()}` : 'Copy to clipboard'}
      className={`flex items-center gap-3 px-5 py-2.5 rounded-full transition-all active:scale-95 group border ${
        copied
          ? 'bg-green-500/20 border-green-500/40 text-green-400'
          : 'bg-white/5 border-white/10 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/5'
      }`}
    >
      <div className="relative">
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
            >
              <Check className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Clipboard className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {label && <span className="text-[10px] font-black uppercase tracking-[0.2em]">{copied ? 'SECURED' : label}</span>}
    </button>
  );
};
