"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { customerApi } from "@/lib/api";

const emptyCart = {
  items: [],
  subtotal: 0,
  totalItems: 0,
};


const toInstantCheckout = (product, quantity = 1) => {
  const normalizedQuantity = Math.max(Number(quantity) || 1, 1);
  const normalizedPrice = Number(product?.price || 0);

  return {
    mode: "buy-now",
    items: [
      {
        id: `instant-${product.id}`,
        product_id: product.id,
        quantity: normalizedQuantity,
        line_total: Number((normalizedPrice * normalizedQuantity).toFixed(2)),
        product,
      },
    ],
    subtotal: Number((normalizedPrice * normalizedQuantity).toFixed(2)),
  };
};


const normalizeInstantCheckout = (checkout) => {
  if (!checkout?.items?.length) {
    return null;
  }

  const items = checkout.items
    .map((item, index) => {
      const product = item.product || null;
      const quantity = Math.max(Number(item.quantity) || 1, 1);
      const productId = Number(item.product_id || product?.id || 0);

      if (!product || !productId) {
        return null;
      }

      return {
        id: item.id || `instant-${productId}-${index}`,
        product_id: productId,
        quantity,
        line_total: Number((Number(product.price || 0) * quantity).toFixed(2)),
        product,
      };
    })
    .filter(Boolean);

  if (!items.length) {
    return null;
  }

  return {
    mode: checkout.mode || "buy-now",
    items,
    subtotal: Number(
      items.reduce((total, item) => total + Number(item.line_total || 0), 0).toFixed(2)
    ),
  };
};


const normalizeCart = (cart = {}) => ({
  items: cart.items || [],
  subtotal: Number(cart.subtotal || 0),
  totalItems: Number(cart.total_items || cart.totalItems || 0),
});

const useCartStore = create(
  persist(
    (set) => ({
      ...emptyCart,
      isOpen: false,
      loading: false,
      instantCheckout: null,
      setCart: (cart) => set(normalizeCart(cart)),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      startInstantCheckout: (product, quantity = 1) => {
        const nextCheckout = normalizeInstantCheckout(toInstantCheckout(product, quantity));
        set({ instantCheckout: nextCheckout, isOpen: false });
        return nextCheckout;
      },
      clearInstantCheckout: () => set({ instantCheckout: null }),
      resetCart: () => set({ ...emptyCart, isOpen: false, instantCheckout: null }),
      fetchCart: async () => {
        set({ loading: true });
        try {
          const payload = await customerApi.getCart();
          const nextCart = normalizeCart(payload.data.cart);
          set(nextCart);
          return nextCart;
        } finally {
          set({ loading: false });
        }
      },
      addToCart: async (product, quantity = 1) => {
        const payload = await customerApi.addToCart({ product_id: product.id, quantity });
        const nextCart = normalizeCart(payload.data.cart);
        set(nextCart);
        return nextCart;
      },
      updateQuantity: async (itemId, quantity) => {
        const payload = await customerApi.updateCartItem(itemId, { quantity });
        const nextCart = normalizeCart(payload.data.cart);
        set(nextCart);
        return nextCart;
      },
      removeItem: async (itemId) => {
        const payload = await customerApi.removeCartItem(itemId);
        const nextCart = normalizeCart(payload.data.cart);
        set(nextCart);
        return nextCart;
      },
      clearCart: async () => {
        const payload = await customerApi.clearCart();
        const nextCart = normalizeCart(payload.data.cart);
        set(nextCart);
        return nextCart;
      },
      placeOrder: async (items = null) => {
        const payload = await customerApi.placeOrder(items ? { items } : {});
        if (!items) {
          set({ ...emptyCart, instantCheckout: null });
        } else {
          set({ instantCheckout: null });
        }
        return payload.data.order;
      },
    }),
    {
      name: "voicemart-cart",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        instantCheckout: state.instantCheckout,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        instantCheckout: normalizeInstantCheckout(persistedState?.instantCheckout),
      }),
    }
  )
);


export default useCartStore;
