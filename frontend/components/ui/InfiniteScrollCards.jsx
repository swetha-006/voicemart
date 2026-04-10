"use client";

import ProductCard from "./ProductCard";


export default function InfiniteScrollCards({
  products,
  focusedProductId,
  onOpen,
  onAddToCart,
  onBuyNow,
}) {
  if (!products?.length) {
    return null;
  }

  if (products.length <= 3) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isFocused={focusedProductId === product.id}
            onOpen={onOpen}
            onAddToCart={onAddToCart}
            onBuyNow={onBuyNow}
          />
        ))}
      </div>
    );
  }

  const duplicatedProducts = [...products, ...products];

  return (
    <div className="marquee-shell py-2">
      <div className="marquee-track gap-6">
        {duplicatedProducts.map((product, index) => (
          <ProductCard
            key={`${product.id}-${index}`}
            product={product}
            isFocused={focusedProductId === product.id}
            onOpen={onOpen}
            onAddToCart={onAddToCart}
            onBuyNow={onBuyNow}
          />
        ))}
      </div>
    </div>
  );
}
