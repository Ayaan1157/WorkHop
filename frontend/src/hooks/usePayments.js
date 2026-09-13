import { useCallback } from "react";
import { API } from "@/lib/api";

// Loads Razorpay checkout.js once
function loadCheckoutScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay."));
    document.body.appendChild(script);
  });
}

async function createOrder(payload) {
  const res = await fetch(`${API}/payments/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Could not start payment.");
  return data;
}

async function verifyPayment(result) {
  const res = await fetch(`${API}/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Payment verification failed.");
  return data;
}

async function openWebCheckout(order, description) {
  await loadCheckoutScript();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: "WorkHop",
      description,
      method: { upi: true, card: true, netbanking: true, wallet: true },
      theme: { color: "#E65A1E" },
      handler: (res) => resolve(res),
      modal: { ondismiss: () => reject(new Error("PAYMENT_CANCELLED")) },
    });
    rzp.open();
  });
}

// Web-only Razorpay hook. startPayment(payload, description) -> verified data.
export function useRazorpay() {
  const startPayment = useCallback(async (payload, description) => {
    const order = await createOrder(payload);
    const result = await openWebCheckout(order, description);
    return verifyPayment(result);
  }, []);
  return { startPayment };
}
