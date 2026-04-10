"use client";

import { motion } from "framer-motion";


export default function ProductCard({
  product,
  isFocused,
  onOpen,
  onAddToCart,
  onBuyNow,
}) {
  return (
    <motion.article
      whileHover={{ y: -8 }}
      className={`group relative flex h-full w-full max-w-[320px] shrink-0 flex-col overflow-hidden rounded-[28px] border p-4 transition ${
        isFocused
          ? "border-cyan-300 shadow-[0_0_0_2px_rgba(103,232,249,0.85),0_0_32px_rgba(6,182,212,0.3)]"
          : "border-cyan-500/15 hover:border-cyan-300/50"
      } hologram-card`}
      id={`product-${product.id}`}
    >
      <button type="button" onClick={() => onOpen(product)} className="text-left">
        <div className="relative overflow-hidden rounded-[24px]">
          <img
            src={product.image_url}
            alt={product.name}
            className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
          <div className="absolute left-4 top-4 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.28em] text-cyber-cyan">
            {product.category?.name || "Featured"}
          </div>
          <div className="absolute bottom-4 right-4 rounded-full border border-neon-pink/40 bg-neon-pink/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.28em] text-neon-pink">
            {product.discount}% Off
          </div>
        </div>
        <div className="mt-5 flex flex-1 flex-col">
          <h3 className="font-display text-xl font-semibold text-white">{product.name}</h3>
          <p className="mt-2 min-h-[4.5rem] text-base text-slate-300">{product.description}</p>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-3xl font-bold text-white">${product.price.toFixed(2)}</span>
            <span className="text-sm text-slate-500 line-through">${product.mrp.toFixed(2)}</span>
          </div>
        </div>
      </button>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => onAddToCart(product)}
          className="cyber-button flex-1 rounded-full px-4 py-3 text-sm font-semibold uppercase tracking-[0.24em]"
        >
          Add to Cart
        </button>
        <button
          type="button"
          onClick={() => onBuyNow(product)}
          className="flex-1 rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-4 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white shadow-neon"
        >
          Buy Now
        </button>
      </div>
    </motion.article>
  );
}
