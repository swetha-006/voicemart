import { Suspense } from "react";

import OrdersPageClient from "@/components/pages/OrdersPageClient";


function OrdersPageFallback() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-6">
        <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Order History</p>
        <h1 className="mt-2 font-display text-4xl text-white">Track every order</h1>
        <p className="mt-2 text-slate-400">Loading order history...</p>
      </section>
    </div>
  );
}


export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersPageFallback />}>
      <OrdersPageClient />
    </Suspense>
  );
}
