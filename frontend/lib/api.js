"use client";

import axios from "axios";

import useAuthStore from "@/store/authStore";


const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});


api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      window.dispatchEvent(new CustomEvent("voicemart:unauthorized"));
    }
    return Promise.reject(error);
  }
);


const unwrap = async (promise) => {
  const response = await promise;
  return response.data;
};


const flattenApiErrors = (errors) => {
  if (!errors) {
    return null;
  }

  if (typeof errors === "string") {
    return errors;
  }

  if (Array.isArray(errors)) {
    return errors.filter(Boolean).join(" ");
  }

  if (typeof errors === "object") {
    const messages = Object.values(errors)
      .flatMap((value) => {
        if (Array.isArray(value)) {
          return value;
        }
        return [value];
      })
      .filter(Boolean)
      .map((value) => String(value).trim());

    return messages.length ? messages.join(" ") : null;
  }

  return null;
};


export const authApi = {
  register: (payload) => unwrap(api.post("/auth/register", payload)),
  requestRegistrationOtp: (payload) => unwrap(api.post("/auth/register/request-otp", payload)),
  verifyRegistrationOtp: (payload) => unwrap(api.post("/auth/register/verify-otp", payload)),
  login: (payload) => unwrap(api.post("/auth/login", payload)),
  getProfile: () => unwrap(api.get("/auth/profile")),
};


export const customerApi = {
  getProducts: (params = {}) => unwrap(api.get("/customer/products", { params })),
  addToCart: (payload) => unwrap(api.post("/customer/cart", payload)),
  getCart: () => unwrap(api.get("/customer/cart")),
  updateCartItem: (itemId, payload) => unwrap(api.put(`/customer/cart/${itemId}`, payload)),
  removeCartItem: (itemId) => unwrap(api.delete(`/customer/cart/${itemId}`)),
  clearCart: () => unwrap(api.delete("/customer/cart")),
  placeOrder: (payload = {}) => unwrap(api.post("/customer/orders", payload)),
  getOrders: () => unwrap(api.get("/customer/orders")),
  cancelOrder: (orderId) => unwrap(api.delete(`/customer/orders/${orderId}`)),
  getProfile: () => unwrap(api.get("/customer/profile")),
  updateProfile: (payload) => unwrap(api.put("/customer/profile", payload)),
  getNotifications: () => unwrap(api.get("/customer/notifications")),
  markNotificationsRead: () => unwrap(api.put("/customer/notifications/read")),
};


export const adminApi = {
  getProducts: () => unwrap(api.get("/admin/products")),
  createProduct: (payload) => unwrap(api.post("/admin/products", payload)),
  updateProduct: (productId, payload) => unwrap(api.put(`/admin/products/${productId}`, payload)),
  deleteProduct: (productId) => unwrap(api.delete(`/admin/products/${productId}`)),
  getOrders: () => unwrap(api.get("/admin/orders")),
  updateOrderStatus: (orderId, payload) =>
    unwrap(api.put(`/admin/orders/${orderId}/status`, payload)),
  getAlerts: (params = {}) => unwrap(api.get("/admin/alerts", { params })),
  resolveAlert: (alertId) => unwrap(api.put(`/admin/alerts/${alertId}/resolve`)),
  getCategories: () => unwrap(api.get("/admin/categories")),
  createCategory: (payload) => unwrap(api.post("/admin/categories", payload)),
  deleteCategory: (categoryId) => unwrap(api.delete("/admin/categories", { data: { id: categoryId } })),
  getAnalytics: () => unwrap(api.get("/admin/analytics")),
  sendTestEmail: (payload) => unwrap(api.post("/admin/test-email", payload)),
};


export const voiceApi = {
  process: (payload) => unwrap(api.post("/voice/process", payload)),
};


export const getApiErrorMessage = (error) =>
  (error?.code === "ERR_NETWORK"
    ? "Cannot reach the VoiceMart API. Start the Flask backend and verify NEXT_PUBLIC_API_URL."
    : null) ||
  (error?.code === "ECONNREFUSED"
    ? "Cannot reach the VoiceMart API. Start the Flask backend and verify NEXT_PUBLIC_API_URL."
    : null) ||
  (error?.code === "ECONNABORTED"
    ? "The request timed out while waiting for the VoiceMart API."
    : null) ||
  flattenApiErrors(error?.response?.data?.errors) ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong.";


export default api;
