import { useEffect, useRef } from "react";
import type { CartSnapshot, ProtocolMessage } from "@carto/shared";
import { CartSocketClient } from "./socketClient";
import { CART_EDGE_WS_URL } from "./config";
import { useCartUiStore } from "../store/cartUiStore";

export function useCartSocket(enabled = true) {
  const setSnapshot = useCartUiStore((state) => state.setSnapshot);
  const setConnected = useCartUiStore((state) => state.setConnected);
  const clientRef = useRef<CartSocketClient | null>(null);

  if (!clientRef.current) {
    clientRef.current = new CartSocketClient(
      CART_EDGE_WS_URL,
      (message: ProtocolMessage) => {
        if (message.type === "cart.snapshot") {
          setSnapshot(message.payload as CartSnapshot);
        }
      },
      setConnected
    );
  }

  useEffect(() => {
    const client = clientRef.current;
    if (!client) return undefined;
    if (!enabled) {
      client.close();
      setConnected(false);
      return undefined;
    }

    client.connect();
    return () => client.close();
  }, [enabled, setConnected]);

  return clientRef.current!;
}
