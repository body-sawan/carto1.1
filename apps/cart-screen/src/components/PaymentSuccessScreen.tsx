import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

interface PaymentSuccessScreenProps {
  onResetSession: () => void;
}

export function PaymentSuccessScreen({ onResetSession }: PaymentSuccessScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onResetSession, 5000);
    return () => clearTimeout(timer);
  }, [onResetSession]);

  return (
    <View style={styles.screen}>
      <View style={styles.panel}>
        <Text style={styles.title}>Payment Successful</Text>
        <Text style={styles.subtitle}>Thank you for shopping</Text>
        <Text style={styles.note}>Returning to QR screen in 5 seconds...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ecfdf5", alignItems: "center", justifyContent: "center", padding: 28 },
  panel: {
    width: "100%",
    maxWidth: 760,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 36,
    alignItems: "center"
  },
  title: { color: "#047857", fontSize: 40, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#142033", fontSize: 24, fontWeight: "900", textAlign: "center", marginTop: 14 },
  note: { color: "#475569", fontSize: 17, fontWeight: "800", textAlign: "center", marginTop: 12 }
});
