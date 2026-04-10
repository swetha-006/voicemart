"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { authApi, getApiErrorMessage } from "@/lib/api";
import { speakText } from "@/lib/speech";
import useAuthStore from "@/store/authStore";


export default function RegisterPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    otp_code: "",
  });
  const [otpRequested, setOtpRequested] = useState(false);
  const [info, setInfo] = useState("");
  const [devOtpHint, setDevOtpHint] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setInfo("");

    try {
      if (!otpRequested) {
        const payload = await authApi.requestRegistrationOtp({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: "customer",
        });
        setOtpRequested(true);
        setInfo(payload.message || "Verification code sent to your email.");
        setDevOtpHint(payload.data?.debug_otp_code || "");
        await speakText("A verification code has been sent to your email address.");
      } else {
        const payload = await authApi.verifyRegistrationOtp({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          otp_code: form.otp_code,
          role: "customer",
        });
        setAuth(payload.data);
        await speakText("Registration successful. Welcome to VoiceMart.");
        router.replace("/");
        router.refresh();
      }
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      await speakText(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchAccount = async () => {
    logout(false);
    await speakText("You have been logged out. You can create a new customer account now.");
  };

  const handleResetOtp = () => {
    setOtpRequested(false);
    setInfo("");
    setDevOtpHint("");
    setError("");
    setForm((current) => ({ ...current, otp_code: "" }));
  };

  const handleResendOtp = async () => {
    setSubmitting(true);
    setError("");
    setInfo("");
    try {
      const payload = await authApi.requestRegistrationOtp({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: "customer",
      });
      setInfo(payload.message || "Verification code sent to your email.");
      setDevOtpHint(payload.data?.debug_otp_code || "");
      await speakText("A fresh verification code has been sent.");
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      await speakText(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-8 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Account Setup</p>
        <h1 className="mt-3 font-display text-4xl text-white">You are already signed in</h1>
        <p className="mt-3 text-lg text-slate-300">
          {user?.full_name || "This account"} is currently active. To create a new customer account,
          sign out first and then register.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleSwitchAccount}
            className="rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-neon"
          >
            Logout and Register
          </button>
          <Link
            href={user?.role === "admin" ? "/admin" : "/"}
            className="inline-flex items-center justify-center rounded-full border border-cyan-400/30 px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-slate-100 transition hover:border-cyan-300/70 hover:bg-cyan-500/10"
          >
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-8 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Account Setup</p>
      <h1 className="mt-3 font-display text-4xl text-white">Create your VoiceMart account</h1>
      <p className="mt-3 text-lg text-slate-300">
        Register once to unlock accessible voice navigation, personalized shopping, and order tracking.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
        <input
          value={form.full_name}
          onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
          placeholder="Full name"
          className="cyber-input rounded-2xl px-4 py-4 md:col-span-2"
          disabled={otpRequested}
          required
        />
        <input
          type="email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="Email"
          className="cyber-input rounded-2xl px-4 py-4"
          disabled={otpRequested}
          required
        />
        <input
          type="password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="Password"
          className="cyber-input rounded-2xl px-4 py-4"
          disabled={otpRequested}
          required
        />
        {otpRequested ? (
          <>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={form.otp_code}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  otp_code: event.target.value.replace(/\D/g, "").slice(0, 6),
                }))
              }
              placeholder="Enter 6-digit OTP"
              className="cyber-input rounded-2xl px-4 py-4 md:col-span-2"
              required
            />
            <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 px-4 py-4 text-sm text-slate-300 md:col-span-2">
              Check your email for the verification code. Gmail SMTP requires an app password in backend settings.
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleResetOtp}
                className="rounded-full border border-cyan-400/30 px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-slate-100 transition hover:border-cyan-300/70 hover:bg-cyan-500/10"
              >
                Change Details
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={submitting}
                className="rounded-full border border-cyber-purple/30 px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-slate-100 transition hover:border-cyber-purple/70 hover:bg-cyber-purple/10 disabled:opacity-60"
              >
                Resend OTP
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 px-4 py-4 text-sm text-slate-300">
            New registrations now require email OTP verification before the customer account is created.
          </div>
        )}

        {info && <p className="md:col-span-2 text-sm text-emerald-300">{info}</p>}
        {devOtpHint && (
          <p className="md:col-span-2 text-sm text-cyan-300">
            Development OTP: <span className="font-semibold">{devOtpHint}</span>
          </p>
        )}
        {error && <p className="md:col-span-2 text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="md:col-span-2 rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-neon disabled:opacity-60"
        >
          {submitting
            ? otpRequested
              ? "Verifying..."
              : "Sending OTP..."
            : otpRequested
              ? "Verify OTP and Register"
              : "Send Verification Code"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="text-cyber-cyan hover:text-white">
          Login here
        </Link>
      </p>
    </div>
  );
}
