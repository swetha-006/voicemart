"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PackageCheck, Truck, Undo2 } from "lucide-react";

import { customerApi, getApiErrorMessage } from "@/lib/api";
import { speakText } from "@/lib/speech";


const statusStyles = {
  New: "bg-cyan-500/15 text-cyan-200 border-cyan-400/20",
  Processing: "bg-cyber-purple/15 text-purple-200 border-cyber-purple/20",
  Shipped: "bg-neon-pink/15 text-pink-200 border-neon-pink/20",
  Delivered: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
  Cancelled: "bg-red-500/15 text-red-200 border-red-400/20",
};


export default function OrdersPageClient() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const showPlacedBanner = searchParams.get("placed") === "1";

  const loadOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await customerApi.getOrders();
      setOrders(payload.data.orders);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancel = async (orderId) => {
    try {
      await customerApi.cancelOrder(orderId);
      await speakText(`Order ${orderId} has been cancelled.`);
      await loadOrders();
    } catch (requestError) {
      await speakText(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-6">
        <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Order History</p>
        <h1 className="mt-2 font-display text-4xl text-white">Track every order</h1>
        <p className="mt-2 text-slate-400">
          Follow your delivery timeline, check order status, and cancel eligible purchases while
          they are still new.
        </p>
      </section>

      {showPlacedBanner && (
        <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-100">
          Payment confirmed and order placed successfully. Your latest order is now in the tracking
          queue below.
        </div>
      )}

      {loading ? (
        <div className="rounded-[30px] border border-cyan-500/15 bg-slate-950/80 p-8 text-slate-300">
          Loading orders...
        </div>
      ) : error ? (
        <div className="rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error}
        </div>
      ) : !orders.length ? (
        <div className="rounded-[30px] border border-cyan-500/15 bg-slate-950/80 p-10 text-center">
          <PackageCheck className="mx-auto h-12 w-12 text-cyber-cyan" />
          <p className="mt-4 text-2xl font-semibold text-white">No orders yet</p>
          <p className="mt-2 text-slate-400">
            Your completed purchases will appear here with live status updates.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-cyber-cyan">
                    Order #{order.id}
                  </p>
                  <h2 className="mt-2 font-display text-3xl text-white">
                    ${order.total_amount.toFixed(2)}
                  </h2>
                  <p className="mt-2 text-slate-400">
                    Placed on {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${statusStyles[order.status]}`}
                  >
                    {order.status}
                  </span>
                  {order.status === "New" && (
                    <button
                      type="button"
                      onClick={() => handleCancel(order.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-red-500/25 px-4 py-2 text-sm text-red-300 transition hover:border-red-400/50 hover:bg-red-500/10"
                    >
                      <Undo2 className="h-4 w-4" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-5">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Items</p>
                  <div className="mt-4 space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">{item.product_name}</p>
                          <p className="text-sm text-slate-400">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-white">${item.line_total.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-5">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Timeline</p>
                  <div className="mt-5 space-y-5">
                    {[
                      { label: "New", icon: PackageCheck },
                      { label: "Processing", icon: PackageCheck },
                      { label: "Shipped", icon: Truck },
                      { label: "Delivered", icon: PackageCheck },
                    ].map((step, index) => {
                      const isComplete =
                        ["New", "Processing", "Shipped", "Delivered"].indexOf(order.status) >=
                        index;
                      const Icon = step.icon;
                      return (
                        <div key={step.label} className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                              isComplete
                                ? "border-cyan-400/40 bg-cyan-400/15 text-cyber-cyan"
                                : "border-slate-700 bg-slate-900 text-slate-500"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{step.label}</p>
                            <p className="text-sm text-slate-400">
                              {isComplete ? "Completed or current stage" : "Pending"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
