import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, KeyRound, ExternalLink, Check } from 'lucide-react';
import { getApiKey, setApiKey } from '../lib/apiKey';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsPanel = ({ open, onClose }: SettingsPanelProps) => {
  const [value, setValue] = useState(() => getApiKey());
  const [saved, setSaved] = useState(false);

  // Reset any unsaved edits back to the actual stored key each time the
  // panel opens, so a discarded draft from a previous visit never lingers
  // and gets accidentally saved over the real key.
  useEffect(() => {
    if (open) setValue(getApiKey());
  }, [open]);

  const handleSave = () => {
    setApiKey(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleClear = () => {
    setApiKey('');
    setValue('');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md glass-input bg-[#0a0f1d] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 pb-10 safe-pb"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Gemini API Key</h2>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-500"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              PostPilot runs entirely in your browser. Your key is stored only on this device and is sent
              directly to Google's API &mdash; never to any other server.
            </p>

            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Paste your Gemini API key"
              aria-label="Gemini API key"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-black/30 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50 mb-3"
            />

            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[11px] font-bold text-cyan-500 uppercase tracking-widest mb-6 w-fit"
            >
              Get a free key at aistudio.google.com
              <ExternalLink className="w-3 h-3" />
            </a>

            <div className="flex gap-3">
              <button
                onClick={handleClear}
                className="px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
              >
                Clear
              </button>
              <button
                onClick={handleSave}
                disabled={!value.trim()}
                className="flex-1 py-3.5 rounded-2xl bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                {saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Key'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
