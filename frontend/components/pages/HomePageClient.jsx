"use client";

import { useEffect, useState } from "react";
import { Search, Sparkles, Volume2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import InfiniteScrollCards from "@/components/ui/InfiniteScrollCards";
import { customerApi, getApiErrorMessage } from "@/lib/api";
import { filterProductsByQuery } from "@/lib/productSearch";
import { speakText } from "@/lib/speech";
import useAuthStore from "@/store/authStore";
import useCartStore from "@/store/cartStore";
import useVoiceStore from "@/store/voiceStore";


export default function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const addToCart = useCartStore((state) => state.addToCart);
  const openCart = useCartStore((state) => state.openCart);
  const startInstantCheckout = useCartStore((state) => state.startInstantCheckout);

  const searchQuery = useVoiceStore((state) => state.searchQuery);
  const focusedProductId = useVoiceStore((state) => state.focusedProductId);
  const setProductsInVoice = useVoiceStore((state) => state.setProducts);
  const setSearchQuery = useVoiceStore((state) => state.setSearchQuery);
  const setFocusedProductId = useVoiceStore((state) => state.setFocusedProductId);
  const openProduct = useVoiceStore((state) => state.openProduct);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const urlQuery = searchParams.get("q");
    if (urlQuery) {
      setSearchQuery(urlQuery);
    }
  }, [searchParams, setSearchQuery]);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await customerApi.getProducts();
        const nextProducts = payload.data.products;
        setProducts(nextProducts);
        setProductsInVoice(nextProducts);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError));
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [setProductsInVoice]);

  const visibleProducts = filterProductsByQuery(products, searchQuery);
  const groupedProducts = visibleProducts.reduce((groups, product) => {
    const categoryName = product.category?.name || "Featured";
    if (!groups[categoryName]) {
      groups[categoryName] = [];
    }
    groups[categoryName].push(product);
    return groups;
  }, {});

  const handleOpen = (product) => {
    setFocusedProductId(product.id);
    openProduct(product);
  };

  const handleAddToCart = async (product) => {
    if (isAdmin) {
      await speakText("Cart and checkout are available on customer accounts only.");
      return;
    }

    if (!isAuthenticated) {
      await speakText("Please log in to add items to your cart.");
      router.push("/login");
      return;
    }

    try {
      await addToCart(product, 1);
      openCart();
      await speakText(`${product.name} added to cart.`);
    } catch (requestError) {
      await speakText(getApiErrorMessage(requestError));
    }
  };

  const handleBuyNow = async (product) => {
    if (isAdmin) {
      await speakText("Checkout is available on customer accounts only.");
      return;
    }

    if (!isAuthenticated) {
      await speakText("Please log in before placing an order.");
      router.push("/login?next=/checkout");
      return;
    }

    try {
      startInstantCheckout(product, 1);
      await speakText(`Taking you to payment for ${product.name}.`);
      router.push("/checkout");
    } catch (requestError) {
      await speakText(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[36px] border border-cyan-500/15 bg-slate-950/80 p-8 backdrop-blur-xl">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_50%)] lg:block" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs uppercase tracking-[0.32em] text-cyber-cyan">
            <Volume2 className="h-4 w-4" />
            Voice-first accessible shopping
          </div>
          <h1 className="mt-5 font-display text-5xl leading-tight text-white sm:text-6xl">
            Shop with voice. Navigate with confidence.
          </h1>
          <p className="mt-5 max-w-2xl text-xl text-slate-300">
            VoiceMart blends spoken commands, seamless cart actions, and strong visual focus cues to
            make e-commerce more usable for people with disabilities.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyber-cyan" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search products or say “search smart speaker”"
                className="cyber-input w-full rounded-full py-4 pl-12 pr-5"
              />
            </label>
            <button
              type="button"
              onClick={() => speakText("Try saying select echo guide, add to cart, or open cart.")}
              className="rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-neon"
            >
              Voice Tips
            </button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              "Say “select touchsense headphones” to focus a product",
              "Say “add to cart” after selecting a product",
              "Say “checkout” or “my orders” to move instantly",
            ].map((hint) => (
              <div key={hint} className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-4">
                <Sparkles className="h-5 w-5 text-neon-pink" />
                <p className="mt-3 text-sm text-slate-300">{hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-[30px] border border-cyan-500/15 bg-slate-950/80 p-10 text-center text-slate-300">
          Loading products...
        </div>
      ) : error ? (
        <div className="rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error}
        </div>
      ) : (
        Object.entries(groupedProducts).map(([categoryName, categoryProducts]) => (
          <section key={categoryName} className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Category</p>
                <h2 className="mt-2 font-display text-3xl text-white">{categoryName}</h2>
              </div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">
                {categoryProducts.length} Products
              </p>
            </div>
            <InfiniteScrollCards
              products={categoryProducts}
              focusedProductId={focusedProductId}
              onOpen={handleOpen}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
            />
          </section>
        ))
      )}

      {!loading && !error && !visibleProducts.length && (
        <div className="rounded-[30px] border border-cyan-500/15 bg-slate-950/80 p-10 text-center">
          <p className="font-display text-3xl text-white">No products matched your search.</p>
          <p className="mt-3 text-slate-400">
            Try a broader term or say a command like “search speaker”.
          </p>
        </div>
      )}
    </div>
  );
}
