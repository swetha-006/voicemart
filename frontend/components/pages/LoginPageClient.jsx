"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { authApi, getApiErrorMessage } from "@/lib/api";
import { speakText } from "@/lib/speech";
import useAuthStore from "@/store/authStore";


export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push(searchParams.get("next") || "/");
    }
  }, [isAuthenticated, router, searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = await authApi.login(form);
      setAuth(payload.data);
      await speakText("Login successful. Welcome back to VoiceMart.");
      router.push(searchParams.get("next") || "/");
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      await speakText(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-8 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Authentication</p>
      <h1 className="mt-3 font-display text-4xl text-white">Login to VoiceMart</h1>
      <p className="mt-3 text-lg text-slate-300">
        Access your cart, orders, profile, and full voice-enabled checkout flow.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          type="email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="Email"
          className="cyber-input w-full rounded-2xl px-4 py-4"
          required
        />
        <input
          type="password"
          value={form.password}
          onChange={(event) =>
            setForm((current) => ({ ...current, password: event.target.value }))
          }
          placeholder="Password"
          className="cyber-input w-full rounded-2xl px-4 py-4"
          required
        />

        {error && <p className="text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-neon disabled:opacity-60"
        >
          {submitting ? "Signing In..." : "Login"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-400">
        New here?{" "}
        <Link href="/register" className="text-cyber-cyan hover:text-white">
          Create an account
        </Link>
      </p>
    </div>
  );
}
