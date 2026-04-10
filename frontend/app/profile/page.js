"use client";

import { useEffect, useState } from "react";

import { customerApi, getApiErrorMessage } from "@/lib/api";
import { speakText } from "@/lib/speech";
import useAuthStore from "@/store/authStore";


export default function ProfilePage() {
  const updateUser = useAuthStore((state) => state.updateUser);

  const [form, setForm] = useState({ full_name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const payload = await customerApi.getProfile();
        setForm(payload.data.user);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = await customerApi.updateProfile(form);
      updateUser(payload.data.user);
      setMessage("Profile updated successfully.");
      await speakText("Your profile has been updated.");
    } catch (requestError) {
      const nextError = getApiErrorMessage(requestError);
      setError(nextError);
      await speakText(nextError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-8">
      <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Profile</p>
      <h1 className="mt-2 font-display text-4xl text-white">Manage your account</h1>
      <p className="mt-2 text-slate-400">
        Update your personal details and keep your VoiceMart profile current.
      </p>

      {loading ? (
        <p className="mt-8 text-slate-300">Loading profile...</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            value={form.full_name}
            onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
            placeholder="Full name"
            className="cyber-input w-full rounded-2xl px-4 py-4"
            required
          />
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="Email"
            className="cyber-input w-full rounded-2xl px-4 py-4"
            required
          />

          {message && <p className="text-sm text-emerald-300">{message}</p>}
          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-neon disabled:opacity-60"
          >
            {saving ? "Saving..." : "Update Profile"}
          </button>
        </form>
      )}
    </div>
  );
}
