"use client";

const statuses = ["New", "Processing", "Shipped", "Delivered"];


export default function OrderTable({ orders, onStatusChange }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-cyan-500/15 bg-slate-950/80">
      <div className="overflow-x-auto">
        <table className="admin-table min-w-full text-left">
          <thead className="bg-slate-900/90 text-xs uppercase tracking-[0.28em] text-slate-400">
            <tr>
              <th className="px-5 py-4">Order</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Items</th>
              <th className="px-5 py-4">Total</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-slate-800">
                <td className="px-5 py-4">
                  <p className="font-semibold text-white">#{order.id}</p>
                  <p className="text-sm text-slate-400">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-white">{order.user?.full_name}</p>
                  <p className="text-sm text-slate-400">{order.user?.email}</p>
                </td>
                <td className="px-5 py-4 text-sm text-slate-300">
                  {order.items.map((item) => `${item.product_name} x${item.quantity}`).join(", ")}
                </td>
                <td className="px-5 py-4 font-semibold text-white">
                  ${order.total_amount.toFixed(2)}
                </td>
                <td className="px-5 py-4">
                  <select
                    value={order.status}
                    onChange={(event) => onStatusChange(order.id, event.target.value)}
                    className="cyber-input w-full rounded-full px-4 py-2"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
