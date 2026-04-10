"use client";

import { useEffect, useState } from "react";

import StatsCard from "@/components/admin/StatsCard";
import { adminApi, getApiErrorMessage } from "@/lib/api";
import { speakText } from "@/lib/speech";
import useAuthStore from "@/store/authStore";


export default function AdminDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testEmailMessage, setTestEmailMessage] = useState("");
  const [testEmailError, setTestEmailError] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  useEffect(() => {
    setTestEmail(user?.email || "");
  }, [user?.email]);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const payload = await adminApi.getAnalytics();
        setAnalytics(payload.data.analytics);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError));
      }
    };

    loadAnalytics();
  }, []);

  const handleSendTestEmail = async (event) => {
    event.preventDefault();
    setSendingTestEmail(true);
    setTestEmailMessage("");
    setTestEmailError("");

    try {
      const payload = await adminApi.sendTestEmail({ email: testEmail });
      setTestEmailMessage(payload.message || `Test email queued for ${testEmail}.`);
      await speakText("Test email queued successfully.");
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setTestEmailError(message);
      await speakText(message);
    } finally {
      setSendingTestEmail(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-red-200">
        {error}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="rounded-[30px] border border-cyan-500/15 bg-slate-950/80 p-8 text-slate-300">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-6">
        <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Analytics</p>
        <h1 className="mt-2 font-display text-4xl text-white">VoiceMart Dashboard</h1>
        <p className="mt-2 text-slate-400">
          Monitor inventory health, delivered revenue, and order throughput from a single command center.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard title="Total Products" value={analytics.total_products} accent="cyan" />
        <StatsCard title="Active Products" value={analytics.active_products} accent="purple" />
        <StatsCard title="Orders" value={analytics.total_orders} accent="pink" />
        <StatsCard title="Revenue" value={analytics.revenue} prefix="$" accent="cyan" />
        <StatsCard title="Categories" value={analytics.category_count} accent="purple" />
      </div>

      <section className="rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Mail Delivery</p>
            <h2 className="mt-2 font-display text-3xl text-white">Send test email</h2>
            <p className="mt-2 text-slate-400">
              Verify Gmail SMTP delivery directly from the admin dashboard.
            </p>
          </div>
          <p className="text-sm uppercase tracking-[0.28em] text-slate-500">
            Sender config must be active on the backend
          </p>
        </div>

        <form onSubmit={handleSendTestEmail} className="mt-6 flex flex-col gap-4 lg:flex-row">
          <input
            type="email"
            value={testEmail}
            onChange={(event) => setTestEmail(event.target.value)}
            placeholder="Recipient email"
            className="cyber-input w-full rounded-2xl px-4 py-4"
            required
          />
          <button
            type="submit"
            disabled={sendingTestEmail}
            className="rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-neon disabled:opacity-60"
          >
            {sendingTestEmail ? "Sending..." : "Send Test Email"}
          </button>
        </form>

        {testEmailMessage && (
          <p className="mt-4 text-sm text-emerald-300">{testEmailMessage}</p>
        )}
        {testEmailError && (
          <p className="mt-4 text-sm text-red-300">{testEmailError}</p>
        )}
      </section>

      <div className="rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Recent Orders</p>
            <h2 className="mt-2 font-display text-3xl text-white">Latest activity</h2>
          </div>
          <p className="text-sm uppercase tracking-[0.28em] text-slate-500">
            {analytics.low_stock_alerts} open low-stock alerts
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {analytics.recent_orders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-3 rounded-[24px] border border-slate-800 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-white">Order #{order.id}</p>
                <p className="text-sm text-slate-400">{order.user?.full_name}</p>
              </div>
              <div>
                <p className="font-semibold text-white">${order.total_amount.toFixed(2)}</p>
                <p className="text-sm text-slate-400">{order.status}</p>
              </div>
              <p className="text-sm text-slate-500">
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
