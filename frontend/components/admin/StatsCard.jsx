"use client";

import { useEffect, useState } from "react";

import { motion } from "framer-motion";


export default function StatsCard({ title, value, prefix = "", suffix = "", accent = "cyan" }) {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = Number(value || 0);

  useEffect(() => {
    let frame = 0;
    const totalFrames = 24;
    const step = numericValue / totalFrames;

    setDisplayValue(0);

    const interval = window.setInterval(() => {
      frame += 1;
      const nextValue = frame >= totalFrames ? numericValue : step * frame;
      setDisplayValue(nextValue);
      if (frame >= totalFrames) {
        window.clearInterval(interval);
      }
    }, 28);

    return () => window.clearInterval(interval);
  }, [numericValue]);

  const accentMap = {
    cyan: "from-cyan-400/20 to-cyan-400/5 border-cyan-400/20",
    purple: "from-cyber-purple/25 to-cyber-purple/5 border-cyber-purple/20",
    pink: "from-neon-pink/25 to-neon-pink/5 border-neon-pink/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[28px] border bg-gradient-to-br p-5 ${accentMap[accent]}`}
    >
      <p className="text-xs uppercase tracking-[0.32em] text-slate-400">{title}</p>
      <p className="mt-3 font-display text-4xl text-white">
        {prefix}
        {displayValue.toLocaleString(undefined, {
          maximumFractionDigits: numericValue % 1 === 0 ? 0 : 2,
          minimumFractionDigits: 0,
        })}
        {suffix}
      </p>
    </motion.div>
  );
}
