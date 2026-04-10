"use client";

import { useEffect, useState } from "react";

import OrderTable from "@/components/admin/OrderTable";
import { adminApi, getApiErrorMessage } from "@/lib/api";
import { speakText } from "@/lib/speech";


export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const loadOrders = async () => {
    try {
      const payload = await adminApi.getOrders();
      setOrders(payload.data.orders);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, status) => {
    try {
      await adminApi.updateOrderStatus(orderId, { status });
      await speakText(`Order ${orderId} updated to ${status}.`);
      await loadOrders();
    } catch (requestError) {
      await speakText(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-6">
        <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Orders</p>
        <h1 className="mt-2 font-display text-4xl text-white">Manage fulfillment</h1>
        <p className="mt-2 text-slate-400">
          Move orders through the fulfillment pipeline from new to delivered.
        </p>
      </section>

      {error ? (
        <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      ) : (
        <OrderTable orders={orders} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}
