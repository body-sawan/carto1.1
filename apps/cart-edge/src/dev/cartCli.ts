import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { CartSession, CartSnapshot, Product } from "@carto/shared";

const DEFAULT_EDGE_URL = "http://localhost:4000";
const edgeUrl = (process.env.CARTO_EDGE_URL ?? DEFAULT_EDGE_URL).replace(/\/+$/, "");

interface CatalogResponse {
  products: Product[];
}

interface DevActionResponse {
  ok: boolean;
  session?: CartSession;
  error?: string;
}

interface HealthResponse {
  ok: boolean;
  cartId: string;
  state: string;
  sessionId: string;
  screenClients: number;
  uptimeSeconds: number;
  timestamp: string;
}

type CommandResult = "continue" | "exit";

async function main() {
  const reachable = await checkBackend();
  if (!reachable) {
    console.error("Cart edge backend is not reachable. Start it with npm run dev:edge first.");
    process.exit(1);
  }

  if (process.argv[2]?.toLowerCase() === "watch") {
    await watchStatus();
    return;
  }

  printHelp();

  const rl = readline.createInterface({ input, output, prompt: "> " });
  if (input.isTTY) rl.prompt();

  for await (const line of rl) {
    const result = await handleCommand(line.trim());
    if (result === "exit") {
      rl.close();
      break;
    }
    if (input.isTTY) rl.prompt();
  }
}

async function handleCommand(line: string): Promise<CommandResult> {
  if (!line) return "continue";

  const [command, ...args] = line.split(/\s+/);
  const value = args.join(" ").trim();

  try {
    switch (command.toLowerCase()) {
      case "show":
        if (value.toLowerCase() === "all") {
          await showAll();
        } else {
          console.log("Unknown show command. Try: show all");
        }
        return "continue";
      case "add":
        await addProduct(value);
        return "continue";
      case "remove":
        await removeProduct(value);
        return "continue";
      case "restart":
        await restartSession();
        return "continue";
      case "status":
        await printStatus();
        return "continue";
      case "watch":
        await watchStatus();
        return "exit";
      case "checkout":
        await startCheckout();
        return "continue";
      case "pay":
        if (value.toLowerCase() === "success") {
          await paySuccess();
        } else if (value.toLowerCase() === "fail") {
          await payFail();
        } else {
          console.log("Unknown pay command. Try: pay success or pay fail");
        }
        return "continue";
      case "cancel":
        if (value.toLowerCase() === "checkout") {
          await cancelCheckout();
        } else {
          console.log("Unknown cancel command. Try: cancel checkout");
        }
        return "continue";
      case "move":
        await moveCart(value);
        return "continue";
      case "help":
        printHelp();
        return "continue";
      case "exit":
      case "quit":
        console.log("Goodbye.");
        return "exit";
      default:
        console.log(`Unknown command: ${command}`);
        console.log("Type help to see available commands.");
        return "continue";
    }
  } catch (error) {
    if (error instanceof TypeError) {
      console.log("Cart edge backend is not reachable. Start it with npm run dev:edge first.");
      return "continue";
    }

    console.log(error instanceof Error ? error.message : String(error));
    return "continue";
  }
}

async function addProduct(name: string) {
  const product = await resolveProductName(name);
  if (!product) return;

  const response = await postJson<DevActionResponse>("/dev/scan", { productId: product.id });
  if (!response.ok) {
    console.log(`Could not add ${product.name}: ${response.error ?? "Unknown backend error"}`);
    return;
  }

  console.log(`Added ${product.name} to cart.`);
}

async function removeProduct(name: string) {
  const product = await resolveProductName(name);
  if (!product) return;

  const response = await postJson<DevActionResponse>("/dev/remove", { productId: product.id });
  if (!response.ok) {
    console.log(`Could not remove ${product.name}: ${response.error ?? "Unknown backend error"}`);
    return;
  }

  console.log(`Removed one ${product.name} from cart.`);
}

async function restartSession() {
  const response = await postJson<DevActionResponse>("/dev/session/reset", {});
  if (!response.ok || !response.session) {
    console.log(`Could not restart cart session: ${response.error ?? "Unknown backend error"}`);
    return;
  }

  console.log(`Session ID: ${response.session.sessionId}`);
  console.log(`State: ${response.session.state}`);
  console.log(`Pairing code: ${response.session.pairing?.pairingCode ?? "not available"}`);
  console.log("Cart session restarted. Ready for new shopping list.");
}

async function printStatus() {
  const health = await getJson<HealthResponse>("/health");
  const snapshot = await getSnapshot();

  console.log(`Backend reachable: ${health.ok ? "yes" : "no"}`);
  console.log(`Cart ID: ${snapshot.cartId}`);
  console.log(`Session ID: ${snapshot.sessionId ?? "not available"}`);
  console.log(`State: ${snapshot.state}`);
  console.log(`List sent: ${snapshot.shoppingList.length > 0 ? "yes" : "no"}`);
  console.log(`Active list ID: ${snapshot.activeListId ?? "none"}`);
  console.log(`Shopping list items: ${snapshot.shoppingList.length}`);
  console.log(`Pairing code: ${snapshot.pairing?.pairingCode ?? "not available"}`);
  console.log(`Cart items: ${snapshot.cartItems.reduce((sum, item) => sum + item.quantity, 0)}`);
  console.log(`Subtotal: ${formatMoney(snapshot.totals.subtotal)}`);
  console.log(`Total: ${formatMoney(snapshot.totals.total)}`);
  console.log(`Payment status: ${snapshot.payment.status}`);
  console.log(`Position: ${snapshot.position.nodeId} (${snapshot.position.x}, ${snapshot.position.y})`);
  console.log(`Route next target: ${snapshot.route.nextTarget ?? "none"}`);
  console.log(`Route nodes: ${snapshot.route.nodes.length ? snapshot.route.nodes.join(" -> ") : "none"}`);
}

async function watchStatus() {
  while (true) {
    try {
      const [health, snapshot] = await Promise.all([
        getJson<HealthResponse>("/health"),
        getSnapshot()
      ]);
      console.clear();
      printLiveDashboard(health, snapshot);
    } catch (error) {
      console.clear();
      console.log("Carto live monitor");
      console.log(`Backend URL: ${edgeUrl}`);
      console.log(`Updated: ${new Date().toLocaleString()}`);
      console.log("");
      console.log("Backend reachable: no");
      console.log(error instanceof Error ? error.message : String(error));
      console.log("");
      console.log("Press Ctrl+C to stop.");
    }

    await delay(1000);
  }
}

function printLiveDashboard(health: HealthResponse, snapshot: CartSnapshot) {
  const listSent = snapshot.shoppingList.length > 0;
  const requestedQuantity = snapshot.shoppingList.reduce((sum, item) => sum + item.quantity, 0);
  const inCartQuantity = snapshot.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const completedListItems = snapshot.shoppingList.filter((item) => item.status === "IN_CART").length;

  console.log("Carto live monitor");
  console.log(`Backend URL: ${edgeUrl}`);
  console.log(`Updated: ${new Date().toLocaleString()}`);
  console.log("");
  console.log(`Backend reachable: ${health.ok ? "yes" : "no"} | Screen clients: ${health.screenClients}`);
  console.log(`Cart: ${snapshot.cartId} | Session: ${snapshot.sessionId ?? "none"}`);
  console.log(`State: ${snapshot.state} | Payment: ${snapshot.payment.status}`);
  console.log(`List sent: ${listSent ? "yes" : "no"} | Active list ID: ${snapshot.activeListId ?? "none"}`);
  console.log(`List progress: ${completedListItems}/${snapshot.shoppingList.length} items complete | Quantity in cart: ${inCartQuantity}/${requestedQuantity}`);
  console.log(`Cart items: ${snapshot.cartItems.length} lines | Total: ${formatMoney(snapshot.totals.total)}`);
  console.log(`Position: ${snapshot.position.nodeId} (${snapshot.position.x}, ${snapshot.position.y}) | Next target: ${snapshot.route.nextTarget ?? "none"}`);

  if (snapshot.pairing && snapshot.state === "WAITING_FOR_LIST") {
    console.log(`Pairing code: ${snapshot.pairing.pairingCode} | Expires: ${snapshot.pairing.expiresAt}`);
  }

  console.log("");
  console.log("Shopping list:");
  if (!snapshot.shoppingList.length) {
    console.log("- waiting for list from webapp");
  } else {
    for (const item of snapshot.shoppingList) {
      console.log(`- ${item.productId} | ${item.name} | needed ${item.quantity} | in cart ${item.inCartQuantity} | ${item.status}`);
    }
  }

  console.log("");
  console.log("Cart receipt:");
  if (!snapshot.cartItems.length) {
    console.log("- empty");
  } else {
    for (const item of snapshot.cartItems) {
      console.log(`- ${item.productId} | ${item.name} | qty ${item.quantity} | line ${formatMoney(item.lineTotal)}`);
    }
  }

  console.log("");
  console.log("Recent alerts:");
  for (const alert of snapshot.alerts.slice(-3)) {
    console.log(`- ${alert.level}: ${alert.message}`);
  }
  console.log("");
  console.log("Press Ctrl+C to stop.");
}

async function startCheckout() {
  const response = await postJson<DevActionResponse>("/dev/checkout", {});
  if (!response.ok || !response.session) {
    console.log(`Could not start checkout: ${response.error ?? "Unknown backend error"}`);
    return;
  }

  console.log(`State: ${response.session.state}`);
  console.log(`Payment status: ${response.session.payment.status}`);
  console.log(`Total amount: ${formatMoney(response.session.payment.amount)}`);
  console.log("Checkout started.");
}

async function paySuccess() {
  const response = await postJson<DevActionResponse>("/dev/payment/success", {});
  if (!response.ok) {
    console.log(`Could not mark payment successful: ${response.error ?? "Unknown backend error"}`);
    return;
  }

  console.log("Payment successful.");
}

async function payFail() {
  const response = await postJson<DevActionResponse>("/dev/payment/failure", {});
  if (!response.ok) {
    console.log(`Could not mark payment failed: ${response.error ?? "Unknown backend error"}`);
    return;
  }

  console.log("Payment failed.");
}

async function cancelCheckout() {
  const response = await postJson<DevActionResponse>("/dev/checkout/cancel", {});
  if (!response.ok) {
    console.log(`Could not cancel checkout: ${response.error ?? "Unknown backend error"}`);
    return;
  }

  console.log("Checkout cancelled. Returned to shopping mode.");
}

async function moveCart(nodeId: string) {
  if (!nodeId) {
    console.log("Please provide a nodeId. Example: move dairy_01");
    console.log("Known nodes: entrance, produce_01, bakery_01, grocery_01, dairy_01, meat_01, checkout");
    return;
  }

  const response = await postJson<DevActionResponse>("/dev/move", { nodeId });
  if (!response.ok || !response.session) {
    console.log(`Could not move cart: ${response.error ?? "Unknown backend error"}`);
    console.log("Known nodes: entrance, produce_01, bakery_01, grocery_01, dairy_01, meat_01, checkout");
    return;
  }

  console.log(`Moved cart to ${response.session.position.nodeId} (${response.session.position.x}, ${response.session.position.y}).`);
}

async function showAll() {
  const catalog = await getCatalog();
  const snapshot = await getSnapshot();

  printProducts(catalog.products);

  console.log("");
  console.log("Current cart:");
  if (!snapshot.cartItems.length) {
    console.log("- empty");
  } else {
    for (const item of snapshot.cartItems) {
      console.log(`- ${item.productId} | ${item.name} | qty: ${item.quantity} | unit: ${formatMoney(item.unitPrice)} | total: ${formatMoney(item.lineTotal)}`);
    }
  }

  console.log(`Totals: subtotal ${formatMoney(snapshot.totals.subtotal)} | discount ${formatMoney(snapshot.totals.discount)} | tax ${formatMoney(snapshot.totals.tax)} | total ${formatMoney(snapshot.totals.total)}`);
  console.log(`State: ${snapshot.state}`);
}

async function resolveProductName(name: string): Promise<Product | null> {
  if (!name) {
    console.log("Please provide a product name.");
    return null;
  }

  const products = (await getCatalog()).products;
  const normalizedName = normalize(name);
  const exactMatches = products.filter((product) => normalize(product.name) === normalizedName);
  if (exactMatches.length === 1) return exactMatches[0];

  const partialMatches = products.filter((product) => normalize(product.name).includes(normalizedName));
  const matches = exactMatches.length > 0 ? exactMatches : partialMatches;

  if (matches.length === 1) return matches[0];

  if (matches.length > 1) {
    console.log(`Multiple products match "${name}". Please be more specific:`);
    printProducts(matches);
    return null;
  }

  console.log(`No product matches "${name}". Available products:`);
  printProducts(products);
  return null;
}

async function checkBackend(): Promise<boolean> {
  try {
    const response = await fetch(`${edgeUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function getCatalog(): Promise<CatalogResponse> {
  return getJson<CatalogResponse>("/dev/catalog");
}

async function getSnapshot(): Promise<CartSnapshot> {
  return getJson<CartSnapshot>("/dev/snapshot");
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${edgeUrl}${path}`);
  return readJsonResponse<T>(response);
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${edgeUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return readJsonResponse<T>(response);
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok && data && typeof data === "object") return data as T;
  if (!response.ok) throw new Error(`Request failed with HTTP ${response.status}`);
  return data as T;
}

function printHelp() {
  console.log("Carto dev CLI");
  console.log("Commands:");
  console.log("  show all");
  console.log("  add <product name>");
  console.log("  remove <product name>");
  console.log("  restart");
  console.log("  status");
  console.log("  watch");
  console.log("  checkout");
  console.log("  pay success");
  console.log("  pay fail");
  console.log("  cancel checkout");
  console.log("  move <nodeId>");
  console.log("  help");
  console.log("  exit");
  console.log("");
  console.log("Examples:");
  console.log("  show all");
  console.log("  add milk 1L");
  console.log("  remove milk 1L");
  console.log("  move dairy_01");
  console.log("  watch");
}

function printProducts(products: Product[]) {
  console.log("Available products:");
  for (const product of products) {
    console.log(`- ${product.id} | ${product.name} | barcode: ${product.barcode} | price: ${formatMoney(product.price)} | category: ${product.category} | shelfId: ${product.shelfId} | mapNodeId: ${product.mapNodeId} | active: ${product.active}`);
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
