"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

import { getApiErrorMessage } from "@/lib/api";
import { speakText } from "@/lib/speech";
import useAuthStore from "@/store/authStore";
import useCartStore from "@/store/cartStore";
import useVoiceStore from "@/store/voiceStore";


export default function ProductModal() {
  const router = useRouter();
  const product = useVoiceStore((state) => state.selectedProduct);
  const closeProduct = useVoiceStore((state) => state.closeProduct);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const addToCart = useCartStore((state) => state.addToCart);
  const openCart = useCartStore((state) => state.openCart);
  const startInstantCheckout = useCartStore((state) => state.startInstantCheckout);
  const isAdmin = user?.role === "admin";

  const handleAddToCart = async () => {
    if (!product) {
      return;
    }

    if (isAdmin) {
      await speakText("Cart and checkout are available on customer accounts only.");
      return;
    }

    if (!isAuthenticated) {
      await speakText("Please log in to add items to your cart.");
      closeProduct();
      router.push("/login");
      return;
    }

    try {
      await addToCart(product, 1);
      openCart();
      await speakText(`${product.name} added to cart.`);
    } catch (error) {
      await speakText(getApiErrorMessage(error));
    }
  };

  const handleBuyNow = async () => {
    if (!product) {
      return;
    }

    if (isAdmin) {
      await speakText("Checkout is available on customer accounts only.");
      return;
    }

    if (!isAuthenticated) {
      await speakText("Please log in before placing an order.");
      closeProduct();
      router.push("/login?next=/checkout");
      return;
    }

    try {
      startInstantCheckout(product, 1);
      closeProduct();
      await speakText(`Taking you to payment for ${product.name}.`);
      router.push("/checkout");
    } catch (error) {
      await speakText(getApiErrorMessage(error));
    }
  };

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeProduct}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            onClick={(event) => event.stopPropagation()}
            className="relative grid w-full max-w-5xl gap-6 overflow-hidden rounded-[32px] border border-cyan-500/20 bg-slate-950/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] lg:grid-cols-[1.15fr_1fr]"
          >
            <button
              type="button"
              onClick={closeProduct}
              className="absolute right-4 top-4 rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-hidden rounded-[28px] border border-cyan-500/15">
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.36em] text-cyber-cyan">
                  {product.category?.name || "Featured"}
                </p>
                <h2 className="mt-3 font-display text-4xl font-semibold text-white">
                  {product.name}
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-slate-300">
                  {product.description}
                </p>
                <div className="mt-6 flex items-end gap-4">
                  <span className="text-4xl font-bold text-white">${product.price.toFixed(2)}</span>
                  <span className="text-lg text-slate-500 line-through">
                    ${product.mrp.toFixed(2)}
                  </span>
                  <span className="rounded-full bg-neon-pink/20 px-3 py-1 text-sm font-semibold uppercase tracking-[0.24em] text-neon-pink">
                    {product.discount}% Off
                  </span>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="cyber-button rounded-full px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em]"
                >
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-neon"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
