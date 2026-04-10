"use client";

import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";


export default function VoiceOrb({ isListening, onToggle, isSupported = true }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.94 }}
      animate={{
        scale: isListening ? [1, 1.08, 1] : [1, 1.02, 1],
        opacity: isListening ? [0.95, 1, 0.95] : [0.9, 1, 0.9],
      }}
      transition={{
        duration: isListening ? 1.15 : 2.2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={`fixed bottom-6 right-6 z-[70] flex h-20 w-20 items-center justify-center rounded-full border shadow-[0_0_45px_rgba(6,182,212,0.26)] backdrop-blur-xl transition ${
        isListening
          ? "border-red-400/60 bg-red-500/20 shadow-[0_0_55px_rgba(248,113,113,0.4)]"
          : "border-cyan-400/50 bg-cyan-400/10"
      }`}
      aria-label={isListening ? "Stop voice control" : "Start voice control"}
    >
      <motion.div
        animate={{
          scale: isListening ? [1, 1.3, 1] : [1, 1.12, 1],
          opacity: isListening ? [0.25, 0.65, 0.25] : [0.14, 0.3, 0.14],
        }}
        transition={{ duration: 1.4, repeat: Infinity }}
        className={`absolute inset-0 rounded-full ${
          isListening ? "bg-red-400/25" : "bg-cyan-400/20"
        }`}
      />
      {isSupported ? (
        <Mic className={`relative z-10 h-8 w-8 ${isListening ? "text-white" : "text-cyber-cyan"}`} />
      ) : (
        <MicOff className="relative z-10 h-8 w-8 text-slate-400" />
      )}
    </motion.button>
  );
}
