# Cart-Webapp Communication Contract

This document describes the current cart/device to webapp/mobile app pairing flow.

The cart-edge backend is the source of truth for the active cart session. The QR code only identifies the cart and pairing code. Do not put the full shopping list in the QR code.

## A. QR payload

The QR code contains only:

```json
{
  "cartId": "cart-01",
  "pairingCode": "123456"
}
```

The QR payload must not include `sessionId`, Bluetooth fields, `receiveListUrl`, `expiresAt`, or shopping list data.

## B. Shopping list endpoint

After scanning the QR code, the webapp sends the shopping list to the cart-edge backend:

```http
POST http://CART_IP:4000/pairing/:pairingCode/list
Content-Type: application/json
```

For a phone or another device on the network, do not use `localhost`. Use the cart or laptop LAN IP instead:

```text
http://192.168.x.x:4000
```

## C. Shopping list payload

```json
{
  "listId": "list-001",
  "source": "mobile-app",
  "createdAt": "2026-05-01T19:00:00.000Z",
  "items": [
    {
      "productId": "p_milk",
      "name": "Milk 1L",
      "quantity": 1
    }
  ]
}
```

Rules:

- `listId` is required and must be non-empty.
- `source` is optional.
- `createdAt` is optional, but if present it must be an ISO datetime string.
- `items` is required and must be a non-empty array.
- Each item must include non-empty `productId` and `name` values.
- `quantity` must be a positive integer.
- `productId` must exist and be active in the cart product catalog.

## D. Success response

```json
{
  "ok": true,
  "cartId": "cart-01",
  "sessionId": "session_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "receivedListId": "list-001",
  "itemCount": 1,
  "status": "list_received"
}
```

The webapp does not need to send `sessionId`. The backend attaches the list to the current active cart session.

## E. Error responses

Invalid shopping list payload:

```json
{
  "ok": false,
  "error": "INVALID_LIST_PAYLOAD",
  "message": "Shopping list items must be a non-empty array."
}
```

Expired pairing:

```json
{
  "ok": false,
  "error": "PAIRING_EXPIRED",
  "message": "This cart pairing session has expired."
}
```

Invalid pairing code:

```json
{
  "ok": false,
  "error": "INVALID_PAIRING_CODE",
  "message": "Invalid pairing code."
}
```

Cart is not waiting for a list:

```json
{
  "ok": false,
  "error": "CART_NOT_WAITING_FOR_LIST",
  "message": "Cart is not waiting for a shopping list."
}
```

Unknown or inactive product:

```json
{
  "ok": false,
  "error": "UNKNOWN_PRODUCT",
  "message": "Unknown or inactive product in shopping list: p_xxx"
}
```

## F. Current transfer method

HTTP is the current supported transfer method for webapp to cart communication.

Do not implement shopping-list transfer by putting the full list in the QR code. The QR code only contains `cartId` and `pairingCode`.

## Future BLE notes

BLE is not implemented for shopping list transfer yet. If BLE is used later, large JSON messages should be split into chunks.

Each chunk should include:

- `messageId`
- `chunkIndex`
- `totalChunks`
- `payloadPart`
- optional `checksum`

The cart should reassemble chunks by `messageId`, validate the full JSON only after every chunk arrives, and send an ACK only after the full message validates. If a chunk fails or is missing, the cart should send an error and the webapp should retry.
