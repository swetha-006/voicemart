"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { getApiErrorMessage } from "@/lib/api";
import { speakText } from "@/lib/speech";
import useCartStore from "@/store/cartStore";


export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCart()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchCart]);

  const handleQuantityChange = async (item, nextQuantity) => {
    try {
      await updateQuantity(item.id, nextQuantity);
      await speakText(
        nextQuantity > 0
          ? `${item.product.name} quantity updated to ${Math.max(nextQuantity, 1)}.`
          : `${item.product.name} removed from cart.`
      );
    } catch (requestError) {
      await speakText(getApiErrorMessage(requestError));
    }
  };

  const handleRemove = async (item) => {
    try {
      await removeItem(item.id);
      await speakText(`${item.product.name} removed from cart.`);
    } catch (requestError) {
      await speakText(getApiErrorMessage(requestError));
    }
  };

  const handlePlaceOrder = async () => {
    router.push("/checkout");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
      <section className="rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-6">
        <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Checkout</p>
        <h1 className="mt-2 font-display text-4xl text-white">Your Cart</h1>
        <p className="mt-2 text-slate-400">
          Adjust quantities, remove items, and then continue to secure payment and checkout.
        </p>

        {loading ? (
          <p className="mt-8 text-slate-300">Loading cart...</p>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-[28px] border border-slate-800 bg-slate-900/70 p-8 text-center">
            <p className="text-2xl font-semibold text-white">Your cart is empty</p>
            <p className="mt-3 text-slate-400">Browse products or say “open cart” after adding something.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-[28px] border border-slate-800 bg-slate-900/70 p-4 sm:flex-row"
              >
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                  className="h-28 w-full rounded-[24px] object-cover sm:w-28"
                />
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-2xl text-white">{item.product.name}</p>
                      <p className="mt-2 text-slate-400">{item.product.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      className="rounded-full border border-slate-700 p-2 text-slate-400 transition hover:border-red-400/40 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full border border-slate-700 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item, item.quantity - 1)}
                        className="rounded-full p-1 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-8 text-center font-semibold text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item, item.quantity + 1)}
                        className="rounded-full p-1 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xl font-semibold text-white">${item.line_total.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <aside className="h-fit rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-6">
        <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Summary</p>
        <h2 className="mt-2 font-display text-3xl text-white">Order Overview</h2>
        <div className="mt-8 space-y-4 text-slate-300">
          <div className="flex items-center justify-between">
            <span>Items</span>
            <span>{items.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xl font-semibold text-white">
            <span>Total</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-8 rounded-[24px] border border-cyan-500/10 bg-cyan-500/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-cyber-cyan" />
            <div>
              <p className="font-semibold text-white">Secure checkout next</p>
              <p className="mt-1 text-sm text-slate-300">
                Shipping, payment method, card validation, and final review now happen on the payment page.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-3">
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={!items.length}
            className="rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-neon disabled:opacity-60"
          >
            Proceed to Payment
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-cyan-400/30 px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-slate-100 transition hover:border-cyan-300/70 hover:bg-cyan-500/10"
          >
            Continue Shopping
          </Link>
          <button
            type="button"
            onClick={async () => {
              try {
                await clearCart();
                await speakText("Your cart has been cleared.");
              } catch (requestError) {
                await speakText(getApiErrorMessage(requestError));
              }
            }}
            disabled={!items.length}
            className="rounded-full border border-red-500/25 px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-red-300 transition hover:border-red-400/50 hover:bg-red-500/10 disabled:opacity-60"
          >
            Clear Cart
          </button>
        </div>
      </aside>
    </div>
  );
}
