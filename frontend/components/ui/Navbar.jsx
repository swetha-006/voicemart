"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Mic,
  ShoppingBag,
  ShoppingCart,
  UserCircle2,
} from "lucide-react";

import { speakText } from "@/lib/speech";
import useAuthStore from "@/store/authStore";
import useCartStore from "@/store/cartStore";
import useVoiceStore from "@/store/voiceStore";

import NotificationBell from "./NotificationBell";


const navLinks = [
  { href: "/", label: "Home" },
  { href: "/orders", label: "Orders" },
  { href: "/profile", label: "Profile" },
];


export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const logout = useAuthStore((state) => state.logout);
  const totalItems = useCartStore((state) => state.totalItems);
  const isListening = useVoiceStore((state) => state.isListening);
  const isAdmin = user?.role === "admin";
  const visibleLinks = isAdmin ? [{ href: "/", label: "Home" }] : navLinks;
  const handleCartClick = () => {
    if (isAdmin) {
      router.push("/admin/orders");
      return;
    }

    if (!isAuthenticated) {
      router.push("/login?next=/cart");
      return;
    }

    router.push("/cart");
  };

  const handleLogout = async () => {
    logout(true);
    await speakText("You have been logged out.");
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-cyan-500/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" prefetch={false} className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 shadow-neon">
            <ShoppingBag className="h-6 w-6 text-cyber-cyan" />
          </div>
          <div>
            <p className="font-display text-2xl font-semibold uppercase tracking-[0.28em] neon-text">
              VoiceMart
            </p>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Accessible commerce, spoken naturally
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className={`text-sm uppercase tracking-[0.28em] transition ${
                pathname === link.href ? "text-cyber-cyan" : "text-slate-300 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              prefetch={false}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.28em] ${
                pathname.startsWith("/admin")
                  ? "border-cyber-purple/80 text-cyber-purple"
                  : "border-cyber-purple/30 text-slate-300 hover:border-cyber-purple/70 hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs uppercase tracking-[0.28em] text-slate-300 sm:flex sm:items-center sm:gap-2">
            <Mic className={`h-4 w-4 ${isListening ? "text-red-400" : "text-cyber-cyan"}`} />
            {isListening ? "Listening" : "Voice Ready"}
          </div>

          {isHydrated && isAuthenticated && user?.role === "customer" && <NotificationBell />}

          <button
            type="button"
            onClick={handleCartClick}
            className="relative rounded-full border border-cyan-400/25 bg-cyan-500/10 p-3 text-white transition hover:border-cyan-300/70 hover:bg-cyan-500/20"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-neon-pink px-1 text-[10px] font-bold text-white">
              {isAdmin ? "!" : totalItems}
            </span>
          </button>

          {!isHydrated ? (
            <div className="h-10 w-24 rounded-full border border-slate-800 bg-slate-900/70" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-4 py-2 sm:flex">
                <UserCircle2 className="h-5 w-5 text-cyber-cyan" />
                <div>
                  <p className="text-sm font-semibold text-white">{user?.full_name}</p>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                    {user?.role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 transition hover:border-red-400/50 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 px-4 py-2 text-sm text-slate-100 transition hover:border-cyan-300/70 hover:bg-cyan-500/10"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
              <Link
                href="/register"
                prefetch={false}
                className="hidden rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-4 py-2 text-sm font-semibold text-white shadow-neon sm:inline-flex"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
