"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, ShieldCheck, Truck } from "lucide-react";
import { useRouter } from "next/navigation";

import { getApiErrorMessage } from "@/lib/api";
import { speakText } from "@/lib/speech";
import useAuthStore from "@/store/authStore";
import useCartStore from "@/store/cartStore";


const SHIPPING_OPTIONS = {
  standard: { label: "Standard Delivery", fee: 0, eta: "3-5 business days" },
  express: { label: "Express Delivery", fee: 14.99, eta: "1-2 business days" },
};

const PAYMENT_METHODS = {
  card: "Credit or Debit Card",
  upi: "UPI",
  cod: "Cash on Delivery",
};


const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;


const sanitizeCardNumber = (value) =>
  value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();


const sanitizeExpiry = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) {
    return digits;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};


const sanitizeCvv = (value) => value.replace(/\D/g, "").slice(0, 4);


const validateCheckoutForm = (form, items) => {
  const errors = {};

  if (!items.length) {
    errors.general = "Your cart is empty.";
  }
  if (!form.full_name.trim()) {
    errors.full_name = "Full name is required.";
  }
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  }
  if (!form.phone.trim()) {
    errors.phone = "Phone number is required.";
  }
  if (!form.address_line_1.trim()) {
    errors.address_line_1 = "Address line 1 is required.";
  }
  if (!form.city.trim()) {
    errors.city = "City is required.";
  }
  if (!form.state.trim()) {
    errors.state = "State is required.";
  }
  if (!form.postal_code.trim()) {
    errors.postal_code = "Postal code is required.";
  }
  if (!form.country.trim()) {
    errors.country = "Country is required.";
  }

  if (form.payment_method === "card") {
    if (form.card_number.replace(/\s/g, "").length !== 16) {
      errors.card_number = "Enter a valid 16-digit card number.";
    }
    if (!/^\d{2}\/\d{2}$/.test(form.expiry)) {
      errors.expiry = "Enter expiry as MM/YY.";
    }
    if (form.cvv.length < 3) {
      errors.cvv = "Enter a valid CVV.";
    }
    if (!form.name_on_card.trim()) {
      errors.name_on_card = "Name on card is required.";
    }
  }

  if (form.payment_method === "upi" && !form.upi_id.trim()) {
    errors.upi_id = "UPI ID is required.";
  }

  return errors;
};


export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const cartItems = useCartStore((state) => state.items);
  const cartSubtotal = useCartStore((state) => state.subtotal);
  const instantCheckout = useCartStore((state) => state.instantCheckout);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const placeOrder = useCartStore((state) => state.placeOrder);
  const clearInstantCheckout = useCartStore((state) => state.clearInstantCheckout);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
    delivery_option: "standard",
    payment_method: "card",
    name_on_card: "",
    card_number: "",
    expiry: "",
    cvv: "",
    upi_id: "",
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      full_name: user?.full_name || current.full_name,
      email: user?.email || current.email,
    }));
  }, [user?.email, user?.full_name]);

  useEffect(() => {
    if (instantCheckout?.items?.length) {
      setLoading(false);
      return;
    }

    fetchCart()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchCart, instantCheckout?.items?.length]);

  const items = instantCheckout?.items?.length ? instantCheckout.items : cartItems;
  const subtotal = instantCheckout?.items?.length ? instantCheckout.subtotal : cartSubtotal;
  const isInstantCheckout = Boolean(instantCheckout?.items?.length);

  const shippingFee = SHIPPING_OPTIONS[form.delivery_option].fee;
  const taxAmount = Number((subtotal * 0.18).toFixed(2));
  const totalAmount = Number((subtotal + shippingFee + taxAmount).toFixed(2));

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", general: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateCheckoutForm(form, items);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      await speakText(nextErrors.general || Object.values(nextErrors)[0]);
      return;
    }

    setSubmitting(true);
    try {
      const itemsPayload = isInstantCheckout
        ? items.map((item) => ({
            product_id: item.product_id || item.product?.id,
            quantity: item.quantity,
          }))
        : null;

      await placeOrder(itemsPayload);
      clearInstantCheckout();
      await speakText("Payment accepted. Your order has been placed successfully.");
      router.push("/orders?placed=1");
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setErrors({ general: message });
      await speakText(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[30px] border border-cyan-500/15 bg-slate-950/80 p-8 text-slate-300">
        Loading payment page...
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Checkout</p>
        <h1 className="mt-3 font-display text-4xl text-white">Your cart is empty</h1>
        <p className="mt-3 text-slate-300">
          Add products to your cart before moving to payment and order confirmation.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-neon"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-6 backdrop-blur-xl"
      >
        <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Secure Payment</p>
        <h1 className="mt-2 font-display text-4xl text-white">Checkout</h1>
        <p className="mt-2 text-slate-400">
          Review delivery details, choose a payment method, and confirm your order securely.
        </p>

        {isInstantCheckout && (
          <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-slate-200">
            You are using Buy Now checkout. This payment flow covers the selected product only and leaves the rest of your cart untouched.
          </div>
        )}

        {errors.general && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {errors.general}
          </div>
        )}

        <section className="mt-8 rounded-[28px] border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-cyber-cyan" />
            <div>
              <h2 className="font-semibold text-white">Shipping Information</h2>
              <p className="text-sm text-slate-400">Where should we deliver your order?</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <input
                value={form.full_name}
                onChange={(event) => setField("full_name", event.target.value)}
                placeholder="Full name"
                className="cyber-input w-full rounded-2xl px-4 py-4"
              />
              {errors.full_name && <p className="mt-2 text-sm text-red-300">{errors.full_name}</p>}
            </div>
            <div>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
                placeholder="Email"
                className="cyber-input w-full rounded-2xl px-4 py-4"
              />
              {errors.email && <p className="mt-2 text-sm text-red-300">{errors.email}</p>}
            </div>
            <div>
              <input
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
                placeholder="Phone number"
                className="cyber-input w-full rounded-2xl px-4 py-4"
              />
              {errors.phone && <p className="mt-2 text-sm text-red-300">{errors.phone}</p>}
            </div>
            <div className="md:col-span-2">
              <input
                value={form.address_line_1}
                onChange={(event) => setField("address_line_1", event.target.value)}
                placeholder="Address line 1"
                className="cyber-input w-full rounded-2xl px-4 py-4"
              />
              {errors.address_line_1 && (
                <p className="mt-2 text-sm text-red-300">{errors.address_line_1}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <input
                value={form.address_line_2}
                onChange={(event) => setField("address_line_2", event.target.value)}
                placeholder="Address line 2 (optional)"
                className="cyber-input w-full rounded-2xl px-4 py-4"
              />
            </div>
            <div>
              <input
                value={form.city}
                onChange={(event) => setField("city", event.target.value)}
                placeholder="City"
                className="cyber-input w-full rounded-2xl px-4 py-4"
              />
              {errors.city && <p className="mt-2 text-sm text-red-300">{errors.city}</p>}
            </div>
            <div>
              <input
                value={form.state}
                onChange={(event) => setField("state", event.target.value)}
                placeholder="State"
                className="cyber-input w-full rounded-2xl px-4 py-4"
              />
              {errors.state && <p className="mt-2 text-sm text-red-300">{errors.state}</p>}
            </div>
            <div>
              <input
                value={form.postal_code}
                onChange={(event) => setField("postal_code", event.target.value)}
                placeholder="Postal code"
                className="cyber-input w-full rounded-2xl px-4 py-4"
              />
              {errors.postal_code && (
                <p className="mt-2 text-sm text-red-300">{errors.postal_code}</p>
              )}
            </div>
            <div>
              <input
                value={form.country}
                onChange={(event) => setField("country", event.target.value)}
                placeholder="Country"
                className="cyber-input w-full rounded-2xl px-4 py-4"
              />
              {errors.country && <p className="mt-2 text-sm text-red-300">{errors.country}</p>}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-cyber-cyan" />
            <div>
              <h2 className="font-semibold text-white">Payment Method</h2>
              <p className="text-sm text-slate-400">Choose how you want to pay.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setField("payment_method", key)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  form.payment_method === key
                    ? "border-cyan-300/40 bg-cyan-400/10 text-white shadow-neon"
                    : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-cyan-400/30 hover:text-white"
                }`}
              >
                <p className="font-semibold">{label}</p>
              </button>
            ))}
          </div>

          {form.payment_method === "card" && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <input
                  value={form.name_on_card}
                  onChange={(event) => setField("name_on_card", event.target.value)}
                  placeholder="Name on card"
                  className="cyber-input w-full rounded-2xl px-4 py-4"
                />
                {errors.name_on_card && (
                  <p className="mt-2 text-sm text-red-300">{errors.name_on_card}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <input
                  value={form.card_number}
                  onChange={(event) => setField("card_number", sanitizeCardNumber(event.target.value))}
                  placeholder="Card number"
                  className="cyber-input w-full rounded-2xl px-4 py-4"
                />
                {errors.card_number && (
                  <p className="mt-2 text-sm text-red-300">{errors.card_number}</p>
                )}
              </div>
              <div>
                <input
                  value={form.expiry}
                  onChange={(event) => setField("expiry", sanitizeExpiry(event.target.value))}
                  placeholder="MM/YY"
                  className="cyber-input w-full rounded-2xl px-4 py-4"
                />
                {errors.expiry && <p className="mt-2 text-sm text-red-300">{errors.expiry}</p>}
              </div>
              <div>
                <input
                  value={form.cvv}
                  onChange={(event) => setField("cvv", sanitizeCvv(event.target.value))}
                  placeholder="CVV"
                  className="cyber-input w-full rounded-2xl px-4 py-4"
                />
                {errors.cvv && <p className="mt-2 text-sm text-red-300">{errors.cvv}</p>}
              </div>
            </div>
          )}

          {form.payment_method === "upi" && (
            <div className="mt-5">
              <input
                value={form.upi_id}
                onChange={(event) => setField("upi_id", event.target.value)}
                placeholder="yourname@bank"
                className="cyber-input w-full rounded-2xl px-4 py-4"
              />
              {errors.upi_id && <p className="mt-2 text-sm text-red-300">{errors.upi_id}</p>}
            </div>
          )}

          {form.payment_method === "cod" && (
            <div className="mt-5 rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-4 text-sm text-slate-300">
              Cash on Delivery is available for this demo checkout. Your order will be confirmed immediately.
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[28px] border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-cyber-cyan" />
            <div>
              <h2 className="font-semibold text-white">Delivery Speed</h2>
              <p className="text-sm text-slate-400">Choose your delivery preference.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {Object.entries(SHIPPING_OPTIONS).map(([key, option]) => (
              <button
                key={key}
                type="button"
                onClick={() => setField("delivery_option", key)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  form.delivery_option === key
                    ? "border-cyan-300/40 bg-cyan-400/10 text-white shadow-neon"
                    : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-cyan-400/30 hover:text-white"
                }`}
              >
                <p className="font-semibold">{option.label}</p>
                <p className="mt-1 text-sm text-slate-400">{option.eta}</p>
                <p className="mt-2 text-sm text-cyber-cyan">
                  {option.fee ? formatCurrency(option.fee) : "Free"}
                </p>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-neon disabled:opacity-60"
          >
            {submitting ? "Processing..." : "Pay and Place Order"}
          </button>
          <Link
            href={isInstantCheckout ? "/" : "/cart"}
            className="inline-flex items-center justify-center rounded-full border border-cyan-400/30 px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-slate-100 transition hover:border-cyan-300/70 hover:bg-cyan-500/10"
          >
            {isInstantCheckout ? "Back to Shopping" : "Back to Cart"}
          </Link>
        </div>
      </form>

      <aside className="h-fit rounded-[32px] border border-cyan-500/15 bg-slate-950/80 p-6 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Order Summary</p>
        <h2 className="mt-2 font-display text-3xl text-white">Final Review</h2>

        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-[24px] border border-slate-800 bg-slate-900/70 p-4"
            >
              <img
                src={item.product.image_url}
                alt={item.product.name}
                className="h-16 w-16 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{item.product.name}</p>
                <p className="text-sm text-slate-400">Qty {item.quantity}</p>
              </div>
              <p className="font-semibold text-white">{formatCurrency(item.line_total)}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-slate-300">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-slate-300">
            <span>Shipping</span>
            <span>{shippingFee ? formatCurrency(shippingFee) : "Free"}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-slate-300">
            <span>Tax</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4 text-xl font-semibold text-white">
            <span>Total</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-cyan-500/10 bg-cyan-500/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-cyber-cyan" />
            <div>
              <p className="font-semibold text-white">Protected checkout flow</p>
              <p className="mt-1 text-sm text-slate-300">
                Review, delivery selection, payment capture, and order placement now happen in one dedicated flow for both cart checkout and Buy Now.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
