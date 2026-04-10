export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-cyan-500/10 bg-slate-950/70 px-4 py-8 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div>
          <p className="font-display text-lg uppercase tracking-[0.28em] text-white">
            VoiceMart
          </p>
          <p className="text-sm text-slate-400">
            Voice-enabled commerce designed to reduce friction for every shopper.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Accessible. Responsive. Production-ready.
        </p>
      </div>
    </footer>
  );
}
