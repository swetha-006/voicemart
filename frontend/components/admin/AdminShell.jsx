"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Boxes, LayoutDashboard, Package2 } from "lucide-react";


const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Boxes },
  { href: "/admin/orders", label: "Orders", icon: Package2 },
  { href: "/admin/alerts", label: "Alerts", icon: AlertTriangle },
];


export default function AdminShell({ children }) {
  const pathname = usePathname();

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="h-fit rounded-[30px] border border-cyan-500/15 bg-slate-950/80 p-5 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Admin Module</p>
        <h2 className="mt-2 font-display text-3xl text-white">Control Center</h2>
        <p className="mt-2 text-sm text-slate-400">
          Manage products, orders, and stock signals from one voice-aware workspace.
        </p>

        <nav className="mt-8 space-y-3">
          {adminLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                  isActive
                    ? "border-cyan-300/40 bg-cyan-400/10 text-white shadow-neon"
                    : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-cyan-400/30 hover:text-white"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-cyber-cyan" : "text-slate-500"}`} />
                <div>
                  <p className="font-semibold">{link.label}</p>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    {link.label === "Dashboard" ? "overview" : link.label.toLowerCase()}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0">{children}</section>
    </div>
  );
}
