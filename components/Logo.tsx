import React from 'react';

import { motion } from 'motion/react';

export const Logo = () => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-3 group cursor-pointer min-w-0"
  >
    <div className="relative w-11 h-11 bg-white rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20 shrink-0 group-hover:scale-105 transition-transform duration-500">
      <img src="./icons/abel-arroyo.webp" alt="Abel Arroyo" className="w-full h-full object-cover" />
    </div>
    <div className="flex flex-col justify-center min-w-0">
      <h1 className="text-xl sm:text-2xl font-[1000] italic tracking-tighter leading-none text-white font-sans group-hover:text-cyan-400 transition-colors duration-500 truncate pr-1">ABEL ARROYO</h1>
      <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
        <span className="text-[7px] font-mono font-black text-cyan-500 tracking-[0.15em] uppercase shrink-0">SYS_FORGE</span>
        <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse shrink-0" />
        <span className="text-[7px] font-mono font-black text-slate-600 tracking-[0.15em] uppercase group-hover:text-slate-400 transition-colors truncate">FORGE_V2.6</span>
      </div>
    </div>
  </motion.div>
);
