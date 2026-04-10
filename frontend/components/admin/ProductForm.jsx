"use client";

import { useEffect, useState } from "react";


const defaultState = {
  name: "",
  description: "",
  category_id: "",
  price: "",
  mrp: "",
  discount: 0,
  stock: 0,
  reorder_level: 0,
  image_url: "",
  is_active: true,
};


export default function ProductForm({
  categories,
  initialValues = null,
  onSubmit,
  onCancel,
  submitting,
}) {
  const [form, setForm] = useState(defaultState);

  useEffect(() => {
    if (initialValues) {
      setForm({
        name: initialValues.name || "",
        description: initialValues.description || "",
        category_id: String(initialValues.category_id || ""),
        price: initialValues.price || "",
        mrp: initialValues.mrp || "",
        discount: initialValues.discount || 0,
        stock: initialValues.stock || 0,
        reorder_level: initialValues.reorder_level || 0,
        image_url: initialValues.image_url || "",
        is_active: Boolean(initialValues.is_active),
      });
      return;
    }

    setForm(defaultState);
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      ...form,
      category_id: Number(form.category_id),
      price: Number(form.price),
      mrp: Number(form.mrp),
      discount: Number(form.discount),
      stock: Number(form.stock),
      reorder_level: Number(form.reorder_level),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[30px] border border-cyan-500/15 bg-slate-950/80 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyber-cyan">
            Product Manager
          </p>
          <h3 className="mt-2 font-display text-3xl text-white">
            {initialValues ? "Edit Product" : "Add Product"}
          </h3>
        </div>
        {initialValues && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
          >
            Cancel Edit
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Product name"
          className="cyber-input rounded-2xl px-4 py-3"
          required
        />
        <select
          name="category_id"
          value={form.category_id}
          onChange={handleChange}
          className="cyber-input rounded-2xl px-4 py-3"
          required
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          name="price"
          value={form.price}
          onChange={handleChange}
          type="number"
          step="0.01"
          min="0"
          placeholder="Price"
          className="cyber-input rounded-2xl px-4 py-3"
          required
        />
        <input
          name="mrp"
          value={form.mrp}
          onChange={handleChange}
          type="number"
          step="0.01"
          min="0"
          placeholder="MRP"
          className="cyber-input rounded-2xl px-4 py-3"
          required
        />
        <input
          name="discount"
          value={form.discount}
          onChange={handleChange}
          type="number"
          min="0"
          max="100"
          placeholder="Discount %"
          className="cyber-input rounded-2xl px-4 py-3"
          required
        />
        <input
          name="stock"
          value={form.stock}
          onChange={handleChange}
          type="number"
          min="0"
          placeholder="Stock"
          className="cyber-input rounded-2xl px-4 py-3"
          required
        />
        <input
          name="reorder_level"
          value={form.reorder_level}
          onChange={handleChange}
          type="number"
          min="0"
          placeholder="Reorder level"
          className="cyber-input rounded-2xl px-4 py-3"
          required
        />
        <input
          name="image_url"
          value={form.image_url}
          onChange={handleChange}
          placeholder="Image URL"
          className="cyber-input rounded-2xl px-4 py-3"
          required
        />
      </div>

      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Product description"
        rows={4}
        className="cyber-input mt-4 w-full rounded-2xl px-4 py-3"
        required
      />

      <label className="mt-4 inline-flex items-center gap-3 text-sm text-slate-300">
        <input
          name="is_active"
          checked={form.is_active}
          onChange={handleChange}
          type="checkbox"
          className="h-4 w-4 accent-cyan-400"
        />
        Active product
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-neon disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Saving..." : initialValues ? "Update Product" : "Create Product"}
      </button>
    </form>
  );
}
