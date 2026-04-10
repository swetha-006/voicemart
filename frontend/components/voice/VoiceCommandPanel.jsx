"use client";

import { useState } from "react";
import { AudioLines, Waves } from "lucide-react";


export default function VoiceCommandPanel({
  transcript,
  interimTranscript,
  lastCommand,
  isListening,
  isSupported,
  statusMessage,
  onSubmitCommand,
}) {
  const [manualCommand, setManualCommand] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!manualCommand.trim()) {
      return;
    }

    await onSubmitCommand?.(manualCommand.trim());
    setManualCommand("");
  };

  return (
    <div className="fixed bottom-32 right-6 z-[68] w-[min(24rem,calc(100vw-2rem))] rounded-[28px] border border-cyan-500/20 bg-slate-950/88 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-cyber-cyan">Voice Console</p>
          <h4 className="mt-1 font-display text-xl text-white">
            {isListening ? "Listening live" : "Ready for commands"}
          </h4>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${
            isSupported
              ? isListening
                ? "bg-red-500/20 text-red-300"
                : "bg-cyan-500/15 text-cyber-cyan"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {isSupported ? (isListening ? "Active" : "Idle") : "Unsupported"}
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-start gap-3">
          <AudioLines className="mt-1 h-5 w-5 text-cyber-cyan" />
          <div className="min-h-14 flex-1">
            <p className="text-sm uppercase tracking-[0.26em] text-slate-500">
              Recognized Speech
            </p>
            <p className="mt-2 text-lg text-white">
              {transcript || interimTranscript || "Say a command like “select echo guide” or “open cart”."}
            </p>
            {interimTranscript && (
              <p className="mt-1 text-sm text-cyan-200/70">{interimTranscript}</p>
            )}
            {statusMessage && (
              <p className="mt-3 text-sm text-amber-200">{statusMessage}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-[24px] border border-slate-800 bg-slate-900/60 p-4">
        <Waves className="mt-1 h-5 w-5 text-neon-pink" />
        <div>
          <p className="text-sm uppercase tracking-[0.26em] text-slate-500">Last Command</p>
          <p className="mt-2 text-base text-slate-200">
            {lastCommand || "No voice command has been executed yet."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <p className="text-sm uppercase tracking-[0.26em] text-slate-500">Manual Command</p>
        <div className="flex gap-3">
          <input
            value={manualCommand}
            onChange={(event) => setManualCommand(event.target.value)}
            placeholder="Type: open cart, search speaker, go to admin"
            className="cyber-input min-w-0 flex-1 rounded-full px-4 py-3 text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white shadow-neon"
          >
            Run
          </button>
        </div>
      </form>
    </div>
  );
}
