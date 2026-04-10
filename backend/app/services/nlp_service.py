import re
from functools import lru_cache

import spacy


PAGE_ALIASES = {
    "home": "/",
    "products": "/",
    "shop": "/",
    "store": "/",
    "cart": "/cart",
    "basket": "/cart",
    "bag": "/cart",
    "checkout": "/checkout",
    "check out": "/checkout",
    "payment": "/checkout",
    "orders": "/orders",
    "order": "/orders",
    "profile": "/profile",
    "admin": "/admin",
    "dashboard": "/admin",
    "admin dashboard": "/admin",
    "alerts": "/admin/alerts",
}

ENTITY_FILLER_WORDS = {
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
}


def normalize_text(text):
    cleaned_text = re.sub(r"[^a-z0-9\s]", " ", (text or "").strip().lower())
    return re.sub(r"\s+", " ", cleaned_text).strip()


def tokenize(text):
    return [token for token in normalize_text(text).split(" ") if token]


def has_any_token(tokens, candidates):
    return any(candidate in tokens for candidate in candidates)


def includes_any_phrase(text, phrases):
    return any(phrase in text for phrase in phrases)


def clean_entity(text):
    return " ".join(token for token in tokenize(text) if token not in ENTITY_FILLER_WORDS)


@lru_cache(maxsize=1)
def load_nlp():
    try:
        return spacy.load("en_core_web_sm")
    except OSError:
        return spacy.blank("en")


def extract_after_keywords(text, keywords):
    for keyword in keywords:
        pattern = rf"{re.escape(keyword)}\s+(.*)$"
        match = re.search(pattern, text)
        if match:
            return clean_entity(match.group(1))
    return None


def extract_product_name(normalized_text, action_keyword):
    explicit_match = re.search(
        rf"{re.escape(action_keyword)}\s+(.*?)\s+to cart$", normalized_text
    )
    if explicit_match:
        return clean_entity(explicit_match.group(1))
    return extract_after_keywords(normalized_text, [action_keyword])


def build_result(intent, entity, action, confidence, response_text):
    return {
        "intent": intent,
        "product_name": entity if intent in {"ADD_TO_CART", "BUY_NOW"} else None,
        "entity": entity,
        "action": action,
        "confidence": confidence,
        "response_text": response_text,
    }


def process_voice_command(text):
    normalized = normalize_text(text)
    tokens = tokenize(normalized)
    doc = load_nlp()(normalized)
    _ = [token.text for token in doc]

    if not normalized:
        return build_result("UNKNOWN", None, "retry", 0.0, "Please say a command.")

    if includes_any_phrase(normalized, ["logout", "log out", "sign out"]):
        return build_result("LOGOUT", None, "logout", 0.97, "Logging you out.")

    if includes_any_phrase(normalized, ["close", "exit", "dismiss", "hide this"]):
        return build_result("CLOSE", None, "close_overlay", 0.95, "Closing the current panel.")

    if (
        (
            has_any_token(tokens, ["activate", "enable", "start", "wake"])
            and has_any_token(tokens, ["voice", "assistant", "mic", "microphone", "listening"])
        )
        or normalized in {"activate", "start", "wake up"}
    ):
        return build_result("ACTIVATE", None, "activate_voice", 0.97, "Voice mode activated.")

    if (("scroll" in tokens) or includes_any_phrase(normalized, ["go down", "go up", "move down", "move up"])) and (
        "down" in tokens or "up" in tokens
    ):
        direction = "down" if "down" in tokens else "up"
        return build_result("SCROLL", direction, f"scroll_{direction}", 0.97, f"Scrolling {direction}.")

    if includes_any_phrase(normalized, ["open cart", "show cart", "view cart"]) or (
        has_any_token(tokens, ["cart", "basket", "bag"])
        and has_any_token(tokens, ["open", "show", "view", "see"])
    ):
        return build_result("VIEW_CART", "cart", "open_cart", 0.96, "Opening your cart.")

    if includes_any_phrase(normalized, ["checkout", "check out", "payment page", "proceed to payment"]) or (
        has_any_token(tokens, ["checkout", "payment", "pay"])
        and has_any_token(tokens, ["go", "open", "take", "proceed", "continue", "start"])
    ):
        return build_result("CHECKOUT", "cart", "go_to_checkout", 0.95, "Taking you to checkout.")

    if includes_any_phrase(normalized, ["track order", "my orders", "order status", "show orders"]) or (
        has_any_token(tokens, ["order", "orders"])
        and has_any_token(tokens, ["track", "status", "my", "show", "open", "view"])
    ):
        return build_result("TRACK_ORDER", "orders", "go_to_orders", 0.94, "Opening your orders.")

    if includes_any_phrase(normalized, ["search", "find", "look for", "show me", "browse"]):
        term = extract_after_keywords(normalized, ["search", "find", "look for", "show me", "browse"])
        return build_result(
            "SEARCH",
            term,
            "filter_products",
            0.92 if term else 0.68,
            f"Searching for {term}." if term else "Tell me what you want to search for.",
        )

    if (
        "add to cart" in normalized
        or (has_any_token(tokens, ["add", "put", "move"]) and has_any_token(tokens, ["cart", "basket", "bag"]))
    ):
        product_name = clean_entity(
            re.sub(r"\b(to|into|in)\s+(my\s+)?(cart|basket|bag)\b", " ", normalized)
        )
        product_name = re.sub(r"^.*?\b(add|put|move)\b\s*", "", product_name).strip() or extract_product_name(normalized, "add")
        return build_result(
            "ADD_TO_CART",
            product_name,
            "add_to_cart",
            0.91 if product_name else 0.77,
            f"Adding {product_name} to your cart." if product_name else "Adding the selected item to your cart.",
        )

    if includes_any_phrase(normalized, ["buy now", "purchase", "order this", "order item"]) or (
        has_any_token(tokens, ["buy", "purchase", "order"])
        and not includes_any_phrase(normalized, ["order status", "my orders", "track order"])
    ):
        product_name = clean_entity(
            re.sub(r"^.*?\b(buy now|buy|purchase|order)\b\s*", "", normalized)
        ) or extract_after_keywords(normalized, ["buy now", "purchase", "buy", "order"])
        return build_result(
            "BUY_NOW",
            product_name,
            "checkout_now",
            0.9,
            f"Starting purchase for {product_name}." if product_name else "Starting your purchase.",
        )

    if "cancel order" in normalized:
        return build_result("CANCEL_ORDER", "order", "cancel_latest_order", 0.86, "Preparing your cancellation request.")

    if normalized.startswith("go to") or normalized.startswith("open ") or normalized.startswith("take me to") or normalized.startswith("navigate to"):
        target_page = extract_after_keywords(normalized, ["go to", "open", "take me to", "navigate to"])
        resolved_path = PAGE_ALIASES.get(target_page, target_page)
        return build_result(
            "NAVIGATE",
            resolved_path,
            "navigate",
            0.88,
            f"Navigating to {target_page}." if target_page else "Navigating now.",
        )

    return build_result(
        "UNKNOWN",
        None,
        "retry",
        0.25,
        "Command not recognized, please try again.",
    )
