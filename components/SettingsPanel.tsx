import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, KeyRound, ExternalLink, Check, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { getApiKey, setApiKey } from '../lib/apiKey';
import { checkForUpdate } from '../lib/updateCheck';
import type { UpdateApplyOutcome } from '../lib/updateApply';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onApplyUpdate: () => Promise<UpdateApplyOutcome>;
}

type UpdateCheckState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'up-to-date' }
  | { kind: 'available' }
  | { kind: 'updating' }
  | { kind: 'blocked'; reason: string }
  | { kind: 'unable'; message: string };

export const SettingsPanel = ({ open, onClose, onApplyUpdate }: SettingsPanelProps) => {
  const [value, setValue] = useState(() => getApiKey());
  const [saved, setSaved] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateCheckState>({ kind: 'idle' });

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

  const handleCheckForUpdates = async () => {
    setUpdateState({ kind: 'checking' });
    const result = await checkForUpdate();
    switch (result.status) {
      case 'up-to-date':
        setUpdateState({ kind: 'up-to-date' });
        return;
      case 'update-available':
        setUpdateState({ kind: 'available' });
        return;
      case 'offline':
        setUpdateState({ kind: 'unable', message: "You're offline. Connect to the internet to check for updates." });
        return;
      case 'network-error':
        setUpdateState({ kind: 'unable', message: 'Could not reach the update server. Check your connection and try again.' });
        return;
      case 'server-error':
        setUpdateState({ kind: 'unable', message: `The update server returned an error (HTTP ${result.httpStatus}). Try again later.` });
        return;
      case 'invalid-data':
        setUpdateState({ kind: 'unable', message: 'The update information could not be read. Try again later.' });
        return;
    }
  };

  const handleUpdateNow = async () => {
    setUpdateState({ kind: 'updating' });
    const outcome = await onApplyUpdate();
    // A successful outcome reloads the page from inside onApplyUpdate - if
    // we're still here to see the result, nothing happened automatically,
    // so only the failure case needs a UI update.
    if (!outcome.ok) {
      setUpdateState({ kind: 'blocked', reason: outcome.reason });
    }
  };

  const handleDismissUpdateStatus = () => {
    setUpdateState({ kind: 'idle' });
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
            className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto custom-scrollbar glass-input bg-[#0a0f1d] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 pb-10 safe-pb"
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
              This app runs entirely in your browser. Your key is stored only on this device and is sent
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

            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">App Updates</h2>
              </div>

              {(updateState.kind === 'idle' || updateState.kind === 'checking' || updateState.kind === 'up-to-date' || updateState.kind === 'unable') && (
                <button
                  onClick={handleCheckForUpdates}
                  disabled={updateState.kind === 'checking'}
                  aria-label="Check for updates"
                  className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 disabled:text-slate-500 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  {updateState.kind === 'checking' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Checking For Updates&hellip;</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> Check For Updates</>
                  )}
                </button>
              )}

              {updateState.kind === 'up-to-date' && (
                <p className="mt-3 flex items-center gap-2 text-xs text-green-400 font-bold">
                  <Check className="w-4 h-4 shrink-0" /> You are on the latest version.
                </p>
              )}

              {updateState.kind === 'unable' && (
                <p className="mt-3 text-xs text-slate-500 leading-relaxed">{updateState.message}</p>
              )}

              {updateState.kind === 'available' && (
                <div className="mt-3 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-xs text-cyan-100 leading-relaxed mb-4">
                    A newer version of Forge is available. Updating will reload the app.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDismissUpdateStatus}
                      className="px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                    >
                      Later
                    </button>
                    <button
                      onClick={handleUpdateNow}
                      className="flex-1 py-3.5 rounded-2xl bg-cyan-500 text-black text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-transform"
                    >
                      Update Now
                    </button>
                  </div>
                </div>
              )}

              {updateState.kind === 'updating' && (
                <div className="mt-3 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-cyan-300 animate-spin shrink-0" />
                  <p className="text-xs text-cyan-100 leading-relaxed">Preparing the update&hellip; Forge will reload shortly.</p>
                </div>
              )}

              {updateState.kind === 'blocked' && (
                <div className="mt-3 p-4 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-red-100/90 leading-relaxed mb-3">{updateState.reason}</p>
                    <button
                      onClick={handleDismissUpdateStatus}
                      className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
