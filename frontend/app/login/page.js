import { Suspense } from "react";

import LoginPageClient from "@/components/pages/LoginPageClient";


function LoginPageFallback() {
  return (
    <div className="mx-auto max-w-xl rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-8 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Authentication</p>
      <h1 className="mt-3 font-display text-4xl text-white">Login to VoiceMart</h1>
      <p className="mt-3 text-lg text-slate-300">Preparing secure sign-in...</p>
    </div>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}
