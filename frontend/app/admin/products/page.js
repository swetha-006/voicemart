"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import ProductForm from "@/components/admin/ProductForm";
import { adminApi, getApiErrorMessage } from "@/lib/api";
import { speakText } from "@/lib/speech";


export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const [productsPayload, categoriesPayload] = await Promise.all([
        adminApi.getProducts(),
        adminApi.getCategories(),
      ]);
      setProducts(productsPayload.data.products);
      setCategories(categoriesPayload.data.categories);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitProduct = async (payload) => {
    setSubmitting(true);
    setError("");
    try {
      if (editingProduct) {
        await adminApi.updateProduct(editingProduct.id, payload);
        await speakText(`${payload.name} updated successfully.`);
      } else {
        await adminApi.createProduct(payload);
        await speakText(`${payload.name} created successfully.`);
      }
      setEditingProduct(null);
      await loadData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      await speakText(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId, name) => {
    try {
      await adminApi.deleteProduct(productId);
      await speakText(`${name} removed from catalog.`);
      await loadData();
    } catch (requestError) {
      await speakText(getApiErrorMessage(requestError));
    }
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    try {
      await adminApi.createCategory(categoryForm);
      setCategoryForm({ name: "", description: "" });
      await speakText("Category created successfully.");
      await loadData();
    } catch (requestError) {
      await speakText(getApiErrorMessage(requestError));
    }
  };

  const handleDeleteCategory = async (categoryId, name) => {
    try {
      await adminApi.deleteCategory(categoryId);
      await speakText(`${name} category deleted.`);
      await loadData();
    } catch (requestError) {
      await speakText(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ProductForm
          categories={categories}
          initialValues={editingProduct}
          onSubmit={handleSubmitProduct}
          onCancel={() => setEditingProduct(null)}
          submitting={submitting}
        />

        <section className="space-y-6">
          <div className="rounded-[30px] border border-cyan-500/15 bg-slate-950/80 p-6">
            <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Categories</p>
            <h2 className="mt-2 font-display text-3xl text-white">Manage categories</h2>
            <form onSubmit={handleCreateCategory} className="mt-6 space-y-3">
              <input
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Category name"
                className="cyber-input w-full rounded-2xl px-4 py-3"
                required
              />
              <textarea
                value={categoryForm.description}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Category description"
                rows={3}
                className="cyber-input w-full rounded-2xl px-4 py-3"
              />
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white shadow-neon"
              >
                Add Category
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-[22px] border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div>
                    <p className="font-semibold text-white">{category.name}</p>
                    <p className="text-sm text-slate-400">{category.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(category.id, category.name)}
                    className="rounded-full border border-red-500/20 p-2 text-red-300 transition hover:border-red-400/50 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[30px] border border-cyan-500/15 bg-slate-950/80 p-6">
        <p className="text-xs uppercase tracking-[0.34em] text-cyber-cyan">Catalog</p>
        <h2 className="mt-2 font-display text-3xl text-white">All products</h2>

        <div className="mt-6 overflow-x-auto">
          <table className="admin-table min-w-full text-left">
            <thead className="bg-slate-900/90 text-xs uppercase tracking-[0.28em] text-slate-400">
              <tr>
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4">Stock</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-slate-800">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-14 w-14 rounded-2xl object-cover"
                      />
                      <div>
                        <p className="font-semibold text-white">{product.name}</p>
                        <p className="text-sm text-slate-400">{product.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-300">{product.category?.name}</td>
                  <td className="px-5 py-4 font-semibold text-white">${product.price.toFixed(2)}</td>
                  <td className="px-5 py-4 text-slate-300">{product.stock}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${
                        product.is_active
                          ? "bg-emerald-500/15 text-emerald-200"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(product)}
                        className="rounded-full border border-cyan-500/20 p-2 text-cyber-cyan transition hover:border-cyan-300/60 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="rounded-full border border-red-500/20 p-2 text-red-300 transition hover:border-red-400/50 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
