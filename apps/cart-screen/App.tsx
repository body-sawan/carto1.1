import { StatusBar } from "expo-status-bar";
import { CartScreen } from "./src/screens/CartScreen";

export default function App() {
  return (
    <>
      <CartScreen />
      <StatusBar style="light" />
    </>
  );
}
