import type { CartSession, EdgeMessageType, ProtocolMessage } from "@carto/shared";

export const PROTOCOL_VERSION = "1.0";

let sequence = 0;

export function edgeMessage<TType extends EdgeMessageType, TPayload>(
  type: TType,
  session: Pick<CartSession, "cartId" | "sessionId">,
  payload: TPayload
): ProtocolMessage<TType, TPayload> {
  sequence += 1;
  return {
    type,
    protocolVersion: PROTOCOL_VERSION,
    cartId: session.cartId,
    sessionId: session.sessionId,
    sequence,
    timestamp: new Date().toISOString(),
    payload
  };
}
