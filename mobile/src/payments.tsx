import React, { useState, useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "./theme";
import RazorpayModal, { CHECKOUT_DISPLAY_CONFIG } from "./components/RazorpayModal";

export type OrderInfo = {
  order_id: string;
  amount: number; // paise
  currency: string;
  key_id: string;
  product: string;
};

export type CheckoutResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type CreateOrderPayload = {
  product: "employer_unlock" | "freelancer_onboarding" | "quota_boost" | "plan";
  full_name?: string;
  freelancer_id?: string;
  employer_id?: string;
  plan_id?: string;
  coupon_code?: string | null;
};

export async function getEmployerId(): Promise<string> {
  let id = await AsyncStorage.getItem("workhop_employer_id");
  if (!id) {
    id = `employer-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem("workhop_employer_id", id);
  }
  return id;
}

async function createOrder(payload: CreateOrderPayload): Promise<OrderInfo> {
  const res = await fetch(`${BACKEND_URL}/api/payments/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Could not start payment.");
  return data;
}

async function verifyPayment(result: CheckoutResult): Promise<any> {
  const res = await fetch(`${BACKEND_URL}/api/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Payment verification failed.");
  return data;
}

// ---- Web checkout (checkout.js) ----
function loadCheckoutScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay."));
    document.body.appendChild(script);
  });
}

async function openWebCheckout(order: OrderInfo, description: string): Promise<CheckoutResult> {
  await loadCheckoutScript();
  return new Promise((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: "WorkHop",
      description,
      method: { upi: true, card: true, netbanking: true, wallet: true },
      config: CHECKOUT_DISPLAY_CONFIG,
      theme: { color: "#FF5A00" },
      handler: (res: CheckoutResult) => resolve(res),
      modal: { ondismiss: () => reject(new Error("PAYMENT_CANCELLED")) },
    });
    rzp.open();
  });
}

// ---- Unified hook: web opens checkout.js, native opens a WebView modal ----
type PendingNative = {
  order: OrderInfo;
  description: string;
  resolve: (r: CheckoutResult) => void;
  reject: (e: Error) => void;
};

export function useRazorpay() {
  const [pending, setPending] = useState<PendingNative | null>(null);

  const startPayment = useCallback(
    async (payload: CreateOrderPayload, description: string): Promise<any> => {
      const order = await createOrder(payload);
      let result: CheckoutResult;
      if (Platform.OS === "web") {
        result = await openWebCheckout(order, description);
      } else {
        result = await new Promise<CheckoutResult>((resolve, reject) =>
          setPending({ order, description, resolve, reject }),
        );
      }
      return verifyPayment(result);
    },
    [],
  );

  const checkoutModal = pending ? (
    <RazorpayModal
      order={pending.order}
      description={pending.description}
      onSuccess={(r) => {
        pending.resolve(r);
        setPending(null);
      }}
      onCancel={() => {
        pending.reject(new Error("PAYMENT_CANCELLED"));
        setPending(null);
      }}
    />
  ) : null;

  return { startPayment, checkoutModal };
}
