"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { getApiErrorMessage } from "@/lib/api";
import { speakText } from "@/lib/speech";
import useAuthStore from "@/store/authStore";
import useCartStore from "@/store/cartStore";


export default function CartDrawer() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isOpen = useCartStore((state) => state.isOpen);
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal);
  const closeCart = useCartStore((state) => state.closeCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAdmin = user?.role === "admin";

  const handleQuantityChange = async (item, nextQuantity) => {
    try {
      await updateQuantity(item.id, nextQuantity);
      await speakText(
        nextQuantity > 0
          ? `${item.product.name} quantity updated to ${Math.max(nextQuantity, 1)}.`
          : `${item.product.name} removed from cart.`
      );
    } catch (error) {
      await speakText(getApiErrorMessage(error));
    }
  };

  const handleRemove = async (item) => {
    try {
      await removeItem(item.id);
      await speakText(`${item.product.name} removed from cart.`);
    } catch (error) {
      await speakText(getApiErrorMessage(error));
    }
  };

  const handleClear = async () => {
    try {
      await clearCart();
      await speakText("Your cart has been cleared.");
    } catch (error) {
      await speakText(getApiErrorMessage(error));
    }
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      await speakText("Please log in before placing an order.");
      closeCart();
      router.push("/login?next=/checkout");
      return;
    }

    closeCart();
    await speakText("Taking you to payment and checkout.");
    router.push("/checkout");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            onClick={closeCart}
            className="fixed inset-0 z-[55] bg-slate-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-md flex-col border-l border-cyan-500/15 bg-slate-950/96 p-5 shadow-[0_0_60px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyber-cyan">
                  Active Cart
                </p>
                <h3 className="font-display text-2xl text-white">Your Basket</h3>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!isAuthenticated ? (
              <div className="mt-8 rounded-[28px] border border-cyan-500/15 bg-cyan-500/5 p-6 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-cyber-cyan" />
                <p className="mt-4 text-lg font-semibold text-white">Log in to use your cart</p>
                <p className="mt-2 text-slate-400">
                  VoiceMart keeps orders, cart actions, and spoken confirmations in sync with your account.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    closeCart();
                    router.push("/login");
                  }}
                  className="mt-5 rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white"
                >
                  Go to Login
                </button>
              </div>
            ) : isAdmin ? (
              <div className="mt-8 rounded-[28px] border border-cyan-500/15 bg-cyan-500/5 p-6 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-cyber-cyan" />
                <p className="mt-4 text-lg font-semibold text-white">Cart is customer-only</p>
                <p className="mt-2 text-slate-400">
                  Admin accounts manage the store from the dashboard. Use a customer account to test checkout.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    closeCart();
                    router.push("/admin");
                  }}
                  className="mt-5 rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white"
                >
                  Open Admin
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="mt-8 rounded-[28px] border border-slate-800 bg-slate-900/70 p-8 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-slate-500" />
                <p className="mt-4 text-lg font-semibold text-white">Your cart is empty</p>
                <p className="mt-2 text-slate-400">
                  Add something by click or voice and it will appear here instantly.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 rounded-[24px] border border-slate-800 bg-slate-900/70 p-4"
                    >
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="h-20 w-20 rounded-2xl object-cover"
                      />
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{item.product.name}</p>
                            <p className="text-sm text-slate-400">${item.product.price.toFixed(2)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            className="text-slate-400 transition hover:text-red-400"
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
                          <p className="font-semibold text-white">${item.line_total.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-800 pt-5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Subtotal</span>
                    <span className="text-xl font-semibold text-white">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    <button
                      type="button"
                      onClick={handlePlaceOrder}
                      className="rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-neon"
                    >
                      Proceed to Payment
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          closeCart();
                          router.push("/cart");
                        }}
                        className="cyber-button rounded-full px-4 py-3 text-sm font-semibold uppercase tracking-[0.24em]"
                      >
                        Open Cart
                      </button>
                      <button
                        type="button"
                        onClick={handleClear}
                        className="rounded-full border border-red-500/25 px-4 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-red-300 transition hover:border-red-400/50 hover:bg-red-500/10"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
