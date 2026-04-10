import { Suspense } from "react";

import HomePageClient from "@/components/pages/HomePageClient";


function HomePageFallback() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[36px] border border-cyan-500/15 bg-slate-950/80 p-8 backdrop-blur-xl">
        <div className="relative z-10 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.32em] text-cyber-cyan">
            Voice-first accessible shopping
          </p>
          <h1 className="mt-5 font-display text-5xl leading-tight text-white sm:text-6xl">
            Shop with voice. Navigate with confidence.
          </h1>
          <p className="mt-5 max-w-2xl text-xl text-slate-300">Loading product experience...</p>
        </div>
      </section>
    </div>
  );
}


export default function HomePage() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePageClient />
    </Suspense>
  );
}
