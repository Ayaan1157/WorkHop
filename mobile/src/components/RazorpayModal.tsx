import { Linking, Modal, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import type { CheckoutResult, OrderInfo } from "../payments";

// Shared Razorpay checkout display config — surfaces UPI (GPay/PhonePe/Paytm)
// as the first payment block on both web and native checkouts.
export const CHECKOUT_DISPLAY_CONFIG = {
  display: {
    blocks: {
      upi: {
        name: "Pay via UPI",
        instruments: [
          {
            method: "upi",
            flows: ["intent", "collect", "qr"],
            apps: ["google_pay", "phonepe", "paytm"],
          },
        ],
      },
      other: {
        name: "Cards, Netbanking & Wallets",
        instruments: [
          { method: "card" },
          { method: "netbanking" },
          { method: "wallet" },
        ],
      },
    },
    sequence: ["block.upi", "block.other"],
    preferences: { show_default_blocks: false },
  },
};

export default function RazorpayModal({
  order,
  description,
  onSuccess,
  onCancel,
}: {
  order: OrderInfo;
  description: string;
  onSuccess: (r: CheckoutResult) => void;
  onCancel: () => void;
}) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body style="background:#F9F9F6;margin:0">
<script>
  var rzp = new Razorpay({
    key: ${JSON.stringify(order.key_id)},
    amount: ${order.amount},
    currency: ${JSON.stringify(order.currency)},
    order_id: ${JSON.stringify(order.order_id)},
    name: "WorkHop",
    description: ${JSON.stringify(description)},
    method: { upi: true, card: true, netbanking: true, wallet: true },
    config: ${JSON.stringify(CHECKOUT_DISPLAY_CONFIG)},
    theme: { color: "#FF5A00" },
    handler: function (res) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "success", data: res }));
    },
    modal: {
      ondismiss: function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "dismiss" }));
      }
    }
  });
  rzp.open();
</script>
</body>
</html>`;

  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.container}>
        <WebView
          source={{ html, baseUrl: "https://workhop.checkout" }}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          onShouldStartLoadWithRequest={(req) => {
            // GPay / PhonePe / Paytm UPI intent deep links must open the
            // native app instead of loading inside the WebView.
            if (/^(upi|gpay|phonepe|paytm|tez|bhim|intent):/i.test(req.url)) {
              Linking.openURL(req.url).catch(() => {});
              return false;
            }
            return true;
          }}
          onMessage={(event) => {
            try {
              const msg = JSON.parse(event.nativeEvent.data);
              if (msg.type === "success") onSuccess(msg.data);
              else onCancel();
            } catch {
              onCancel();
            }
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F6" },
});
