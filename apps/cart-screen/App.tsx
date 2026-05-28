import { StatusBar } from "expo-status-bar";
import { CartScreen } from "./src/screens/CartScreen";
import { useCartUiStore } from "./src/store/cartUiStore";

export default function App() {
  const themeName = useCartUiStore((state) => state.theme);

  return (
    <>
      <CartScreen />
      <StatusBar style={themeName === "premium_light" ? "dark" : "light"} />
    </>
  );
}
