import { useEffect, useMemo } from "react";
import type { CartSnapshot, ProtocolMessage } from "@carto/shared";
import { CartSocketClient } from "./socketClient";
import { CART_EDGE_WS_URL } from "./config";
import { useCartUiStore } from "../store/cartUiStore";

export function useCartSocket() {
  const setSnapshot = useCartUiStore((state) => state.setSnapshot);
  const setConnected = useCartUiStore((state) => state.setConnected);

  const client = useMemo(() => new CartSocketClient(
    CART_EDGE_WS_URL,
    (message: ProtocolMessage) => {
      if (message.type === "cart.snapshot") setSnapshot(message.payload as CartSnapshot);
    },
    setConnected
  ), [setConnected, setSnapshot]);

  useEffect(() => {
    client.connect();
    return () => client.close();
  }, [client]);

  return client;
}
