"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { adminApi, getApiErrorMessage } from "@/lib/api";
import { speakText } from "@/lib/speech";


export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");

  const loadAlerts = async () => {
    try {
      const payload = await adminApi.getAlerts();
      setAlerts(payload.data.alerts);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleResolve = async (alertId) => {
    try {
      await adminApi.resolveAlert(alertId);
      await speakText(`Alert ${alertId} resolved.`);
      await loadAlerts();
    } catch (requestError) {
      await speakText(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-6">
        <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Alerts</p>
        <h1 className="mt-2 font-display text-4xl text-white">Low-stock signals</h1>
        <p className="mt-2 text-slate-400">
          APScheduler-generated alerts help your team act before inventory becomes unavailable.
        </p>
      </section>

      {error ? (
        <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      ) : !alerts.length ? (
        <div className="rounded-[28px] border border-cyan-500/15 bg-slate-950/80 p-10 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
          <p className="mt-4 text-2xl font-semibold text-white">No unresolved alerts</p>
          <p className="mt-2 text-slate-400">Inventory levels are currently above reorder thresholds.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <article
              key={alert.id}
              className="flex flex-col gap-4 rounded-[28px] border border-cyan-500/15 bg-slate-950/80 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-neon-pink/15 p-3 text-neon-pink">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {alert.product?.name || `Product ${alert.product_id}`}
                  </p>
                  <p className="mt-1 text-slate-300">{alert.message}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.28em] text-slate-500">
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleResolve(alert.id)}
                className="rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white shadow-neon"
              >
                Resolve
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
