import { normalizeSearchText, tokenizeSearch } from "@/lib/productSearch";


export const PAGE_ALIASES = {
  home: "/",
  products: "/",
  shop: "/",
  store: "/",
  cart: "/cart",
  basket: "/cart",
  bag: "/cart",
  checkout: "/checkout",
  "check out": "/checkout",
  payment: "/checkout",
  pay: "/checkout",
  orders: "/orders",
  order: "/orders",
  profile: "/profile",
  login: "/login",
  register: "/register",
  admin: "/admin",
  dashboard: "/admin",
  "admin dashboard": "/admin",
  alerts: "/admin/alerts",
};


const ENTITY_FILLER_WORDS = new Set([
  "a",
  "an",
  "assistant",
  "can",
  "could",
  "for",
  "i",
  "item",
  "like",
  "me",
  "my",
  "need",
  "please",
  "product",
  "products",
  "some",
  "the",
  "want",
  "would",
  "you",
]);

const CART_ALIASES = ["cart", "basket", "bag"];
const SEARCH_PREFIXES = ["search for ", "search ", "find ", "look for ", "show me ", "browse "];
const NAVIGATION_PREFIXES = ["go to ", "take me to ", "navigate to ", "open ", "visit "];
const SELECT_PREFIXES = ["select ", "choose ", "focus on ", "highlight ", "view ", "open "];


export const normalizeSpeech = (value = "") => normalizeSearchText(value);


const hasAnyToken = (tokens, candidates) => candidates.some((candidate) => tokens.includes(candidate));


const includesAnyPhrase = (text, phrases) => phrases.some((phrase) => text.includes(phrase));


const cleanEntity = (value = "") =>
  tokenizeSearch(value)
    .filter((token) => !ENTITY_FILLER_WORDS.has(token))
    .join(" ");


const extractAfterPrefix = (text, prefixes) => {
  for (const prefix of prefixes) {
    const startIndex = text.indexOf(prefix);
    if (startIndex !== -1) {
      return cleanEntity(text.slice(startIndex + prefix.length));
    }
  }
  return "";
};


const stripTrailingPattern = (text, pattern) => text.replace(pattern, " ").replace(/\s+/g, " ").trim();


const resolvePageTarget = (value = "") => {
  const normalizedTarget = normalizeSpeech(value);
  return PAGE_ALIASES[normalizedTarget] || "";
};


export const matchVoiceCommand = (transcript) => {
  const text = normalizeSpeech(transcript);
  const tokens = tokenizeSearch(text);

  if (!text) {
    return { intent: "UNKNOWN", entity: "" };
  }

  if (
    ["activate", "start", "wake up"].includes(text) ||
    (
      hasAnyToken(tokens, ["activate", "enable", "start", "wake"]) &&
      hasAnyToken(tokens, ["voice", "assistant", "mic", "microphone", "listening"])
    )
  ) {
    return { intent: "ACTIVATE", entity: "" };
  }

  if (includesAnyPhrase(text, ["logout", "log out", "sign out"])) {
    return { intent: "LOGOUT", entity: "" };
  }

  if (includesAnyPhrase(text, ["exit", "close", "dismiss", "hide this"])) {
    return { intent: "CLOSE", entity: "" };
  }

  if (
    (tokens.includes("scroll") || includesAnyPhrase(text, ["go down", "go up", "move down", "move up"])) &&
    (tokens.includes("down") || tokens.includes("up"))
  ) {
    return {
      intent: "SCROLL",
      entity: tokens.includes("down") ? "down" : "up",
    };
  }

  if (
    includesAnyPhrase(text, ["open cart", "show cart", "view cart"]) ||
    (hasAnyToken(tokens, CART_ALIASES) && hasAnyToken(tokens, ["open", "show", "view", "see"]))
  ) {
    return { intent: "OPEN_CART", entity: "" };
  }

  if (
    includesAnyPhrase(text, ["checkout", "check out", "payment page", "proceed to payment"]) ||
    (
      hasAnyToken(tokens, ["checkout", "payment", "pay"]) &&
      hasAnyToken(tokens, ["go", "open", "take", "proceed", "continue", "start"])
    )
  ) {
    return { intent: "CHECKOUT", entity: "" };
  }

  if (
    includesAnyPhrase(text, ["my orders", "track order", "order status", "show orders"]) ||
    (
      hasAnyToken(tokens, ["order", "orders"]) &&
      hasAnyToken(tokens, ["my", "track", "status", "show", "open", "view"])
    )
  ) {
    return { intent: "MY_ORDERS", entity: "" };
  }

  const navigationTarget = extractAfterPrefix(text, NAVIGATION_PREFIXES);
  if (navigationTarget) {
    const resolvedPage = resolvePageTarget(navigationTarget);
    if (resolvedPage) {
      return { intent: "NAVIGATE", entity: resolvedPage };
    }
  }

  const searchEntity = extractAfterPrefix(text, SEARCH_PREFIXES);
  if (searchEntity) {
    return { intent: "SEARCH", entity: searchEntity };
  }

  if (
    (tokens.includes("add") || tokens.includes("put") || tokens.includes("move")) &&
    hasAnyToken(tokens, CART_ALIASES)
  ) {
    const entity = cleanEntity(
      stripTrailingPattern(
        text.replace(/^.*?\b(add|put|move)\b\s*/, ""),
        /\b(to|into|in)\s+(my\s+)?(cart|basket|bag)\b/
      )
    );
    return { intent: "ADD_TO_CART", entity };
  }

  if (text === "add to cart") {
    return { intent: "ADD_TO_CART", entity: "" };
  }

  if (
    includesAnyPhrase(text, ["buy now", "purchase", "order this", "order item"]) ||
    (
      hasAnyToken(tokens, ["buy", "purchase", "order"]) &&
      !includesAnyPhrase(text, ["order status", "my orders", "track order"])
    )
  ) {
    const entity = cleanEntity(
      text
        .replace(/^.*?\b(buy now|buy|purchase|order)\b\s*/, "")
        .replace(/\b(now|please)\b/g, " ")
    );
    return { intent: "BUY_NOW", entity };
  }

  const selectEntity = extractAfterPrefix(text, SELECT_PREFIXES);
  if (selectEntity && !resolvePageTarget(selectEntity) && !hasAnyToken(tokens, CART_ALIASES)) {
    return { intent: "SELECT_PRODUCT", entity: selectEntity };
  }

  return { intent: "UNKNOWN", entity: "" };
};
