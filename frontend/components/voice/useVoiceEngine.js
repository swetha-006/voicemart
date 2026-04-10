"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getApiErrorMessage, voiceApi } from "@/lib/api";
import { filterProductsByQuery, findBestProductMatch } from "@/lib/productSearch";
import { speakText } from "@/lib/speech";
import { matchVoiceCommand, normalizeSpeech } from "@/lib/voiceIntents";
import useAuthStore from "@/store/authStore";
import useCartStore from "@/store/cartStore";
import useVoiceStore from "@/store/voiceStore";


const getRecognitionConstructor = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};


const mapBackendIntent = (payload) => {
  const intentMap = {
    SEARCH: "SEARCH",
    ADD_TO_CART: "ADD_TO_CART",
    BUY_NOW: "BUY_NOW",
    VIEW_CART: "OPEN_CART",
    CHECKOUT: "CHECKOUT",
    TRACK_ORDER: "MY_ORDERS",
    NAVIGATE: "NAVIGATE",
    SCROLL: "SCROLL",
  };

  return {
    intent: intentMap[payload.intent] || "UNKNOWN",
    entity: payload.entity || payload.product_name || "",
  };
};


export default function useVoiceEngine() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSupported, setIsSupported] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  const recognitionRef = useRef(null);
  const manualStopRef = useRef(false);
  const commandHandlerRef = useRef(null);
  const assistantSpeakingRef = useRef(false);
  const resumeAfterSpeechRef = useRef(false);
  const lastAssistantSpeechRef = useRef({ text: "", timestamp: 0 });
  const isListeningRef = useRef(false);
  const voiceEnabledRef = useRef(false);

  const voiceEnabled = useVoiceStore((state) => state.voiceEnabled);
  const isListening = useVoiceStore((state) => state.isListening);
  const transcript = useVoiceStore((state) => state.transcript);
  const interimTranscript = useVoiceStore((state) => state.interimTranscript);
  const lastCommand = useVoiceStore((state) => state.lastCommand);
  const products = useVoiceStore((state) => state.products);
  const focusedProductId = useVoiceStore((state) => state.focusedProductId);
  const selectedProduct = useVoiceStore((state) => state.selectedProduct);
  const setListening = useVoiceStore((state) => state.setListening);
  const setTranscript = useVoiceStore((state) => state.setTranscript);
  const setInterimTranscript = useVoiceStore((state) => state.setInterimTranscript);
  const setLastCommand = useVoiceStore((state) => state.setLastCommand);
  const setSearchQuery = useVoiceStore((state) => state.setSearchQuery);
  const setFocusedProductId = useVoiceStore((state) => state.setFocusedProductId);
  const openProduct = useVoiceStore((state) => state.openProduct);
  const closeProduct = useVoiceStore((state) => state.closeProduct);
  const setVoiceEnabled = useVoiceStore((state) => state.setVoiceEnabled);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isAdmin = user?.role === "admin";

  const addToCart = useCartStore((state) => state.addToCart);
  const openCart = useCartStore((state) => state.openCart);
  const closeCart = useCartStore((state) => state.closeCart);
  const startInstantCheckout = useCartStore((state) => state.startInstantCheckout);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    const handleSpeechStart = (event) => {
      assistantSpeakingRef.current = true;
      lastAssistantSpeechRef.current = {
        text: normalizeSpeech(event.detail?.text || ""),
        timestamp: Date.now(),
      };

      if (recognitionRef.current && isListeningRef.current) {
        resumeAfterSpeechRef.current = true;
        manualStopRef.current = true;
        recognitionRef.current.stop();
      } else {
        resumeAfterSpeechRef.current = false;
      }

      isListeningRef.current = false;
      setListening(false);
      setInterimTranscript("");
    };

    const handleSpeechEnd = () => {
      assistantSpeakingRef.current = false;

      if (!resumeAfterSpeechRef.current || !recognitionRef.current || !voiceEnabledRef.current) {
        resumeAfterSpeechRef.current = false;
        return;
      }

      resumeAfterSpeechRef.current = false;
      manualStopRef.current = false;

      window.setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch (error) {
          setListening(false);
        }
      }, 150);
    };

    window.addEventListener("voicemart:speech-start", handleSpeechStart);
    window.addEventListener("voicemart:speech-end", handleSpeechEnd);

    return () => {
      window.removeEventListener("voicemart:speech-start", handleSpeechStart);
      window.removeEventListener("voicemart:speech-end", handleSpeechEnd);
    };
  }, [setInterimTranscript, setListening]);

  useEffect(() => {
    commandHandlerRef.current = async (spokenText) => {
      const normalized = normalizeSpeech(spokenText);

      if (!normalized) {
        return;
      }

      setTranscript(normalized);
      setInterimTranscript("");
      setLastCommand(normalized);

      window.dispatchEvent(
        new CustomEvent("voicemart:voice-intent", {
          detail: { transcript: normalized },
        })
      );

      let command = matchVoiceCommand(normalized);

      if (command.intent === "UNKNOWN") {
        try {
          const payload = await voiceApi.process({ text: normalized });
          command = mapBackendIntent(payload.data);
        } catch (error) {
          command = { intent: "UNKNOWN", entity: "" };
        }
      }

      const activeProduct =
        (command.entity && findBestProductMatch(command.entity, products)) ||
        products.find((product) => product.id === focusedProductId) ||
        selectedProduct ||
        null;

      const requiresCustomerAccount = ["ADD_TO_CART", "BUY_NOW", "OPEN_CART", "CHECKOUT", "MY_ORDERS"];
      if (isAdmin && requiresCustomerAccount.includes(command.intent)) {
        await speakText("Customer shopping commands are disabled for admin accounts.");
        return;
      }

      window.dispatchEvent(
        new CustomEvent("voicemart:voice-command", {
          detail: { intent: command.intent, entity: command.entity, transcript: normalized },
        })
      );

      switch (command.intent) {
        case "ACTIVATE":
          setVoiceEnabled(true);
          await speakText("Voice mode activated.");
          break;
        case "SELECT_PRODUCT":
          if (activeProduct) {
            setFocusedProductId(activeProduct.id);
            openProduct(activeProduct);
            document.getElementById(`product-${activeProduct.id}`)?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            await speakText(`${activeProduct.name} selected.`);
          } else {
            await speakText("Command not recognized, please try again.");
          }
          break;
        case "ADD_TO_CART":
          if (!isAuthenticated) {
            await speakText("Please log in to add items to your cart.");
            router.push("/login?next=/cart");
            break;
          }
          if (!activeProduct) {
            await speakText("Command not recognized, please try again.");
            break;
          }
          try {
            await addToCart(activeProduct, 1);
            openCart();
            await speakText(`${activeProduct.name} added to cart.`);
          } catch (error) {
            await speakText(getApiErrorMessage(error));
          }
          break;
        case "BUY_NOW":
          if (!isAuthenticated) {
            await speakText("Please log in before placing an order.");
            router.push("/login?next=/checkout");
            break;
          }
          if (!activeProduct) {
            await speakText("Command not recognized, please try again.");
            break;
          }
          try {
            startInstantCheckout(activeProduct, 1);
            closeProduct();
            await speakText(`Taking you to payment for ${activeProduct.name}.`);
            router.push("/checkout");
          } catch (error) {
            await speakText(getApiErrorMessage(error));
          }
          break;
        case "OPEN_CART":
          if (!isAuthenticated) {
            await speakText("Please log in to open your cart.");
            router.push("/login?next=/cart");
            break;
          }
          router.push("/cart");
          await speakText("Opening your cart page.");
          break;
        case "CHECKOUT":
          if (!isAuthenticated) {
            await speakText("Please log in before opening checkout.");
            router.push("/login?next=/checkout");
            break;
          }
          router.push("/checkout");
          await speakText("Taking you to payment and checkout.");
          break;
        case "SCROLL":
          window.scrollBy({
            top: command.entity === "down" ? 520 : -520,
            behavior: "smooth",
          });
          await speakText(command.entity === "down" ? "Scrolling down." : "Scrolling up.");
          break;
        case "NAVIGATE": {
          const destination = command.entity?.startsWith("/") ? command.entity : "/";
          router.push(destination);
          await speakText(
            destination === "/" ? "Navigating to home." : `Navigating to ${destination.replace("/", "")}.`
          );
          break;
        }
        case "SEARCH": {
          const searchTerm = command.entity || "";
          setSearchQuery(searchTerm);
          if (pathname !== "/") {
            router.push("/");
          }
          const matchCount = filterProductsByQuery(products, searchTerm).length;
          await speakText(
            matchCount
              ? `Showing ${matchCount} results for ${searchTerm}.`
              : `No products found for ${searchTerm}.`
          );
          break;
        }
        case "CLOSE":
          closeProduct();
          closeCart();
          await speakText("Closing the current panel.");
          break;
        case "MY_ORDERS":
          router.push("/orders");
          await speakText("Opening your orders.");
          break;
        case "LOGOUT":
          logout(true);
          closeCart();
          closeProduct();
          await speakText("Logging you out.");
          router.push("/login");
          break;
        default:
          await speakText("Command not recognized, please try again.");
      }
    };
  }, [
    addToCart,
    closeCart,
    closeProduct,
    focusedProductId,
    isAdmin,
    isAuthenticated,
    logout,
    openCart,
    openProduct,
    pathname,
    products,
    router,
    selectedProduct,
    setFocusedProductId,
    setInterimTranscript,
    setLastCommand,
    setSearchQuery,
    setTranscript,
    setVoiceEnabled,
    startInstantCheckout,
  ]);

  useEffect(() => {
    const SpeechRecognition = getRecognitionConstructor();
    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatusMessage(
        "Speech recognition is not available in this browser. Use Chrome or Edge, or type a command below."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      isListeningRef.current = true;
      setListening(true);
      setStatusMessage("");
    };

    recognition.onresult = (event) => {
      let nextInterim = "";
      let finalTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const value = event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          finalTranscript += ` ${value}`;
        } else {
          nextInterim += ` ${value}`;
        }
      }

      setInterimTranscript(nextInterim.trim());

      if (finalTranscript.trim()) {
        const normalizedFinalTranscript = normalizeSpeech(finalTranscript.trim());
        const lastAssistantSpeech = lastAssistantSpeechRef.current;

        if (
          assistantSpeakingRef.current ||
          (
            lastAssistantSpeech.text &&
            normalizedFinalTranscript === lastAssistantSpeech.text &&
            Date.now() - lastAssistantSpeech.timestamp < 5000
          )
        ) {
          setInterimTranscript("");
          return;
        }

        setStatusMessage("");
        commandHandlerRef.current?.(finalTranscript.trim());
      }
    };

    recognition.onerror = async (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        isListeningRef.current = false;
        resumeAfterSpeechRef.current = false;
        setListening(false);
        setStatusMessage("Microphone permission is blocked. Allow mic access and try again.");
        await speakText("Microphone permission is required for voice controls.");
        return;
      }

      if (event.error === "no-speech") {
        setStatusMessage("No speech was detected. Try again or type a command below.");
        return;
      }

      if (event.error === "audio-capture") {
        isListeningRef.current = false;
        resumeAfterSpeechRef.current = false;
        setStatusMessage("No microphone was detected. Connect a microphone and try again.");
        setListening(false);
        return;
      }

      isListeningRef.current = false;
      setStatusMessage("Voice recognition could not start cleanly. You can type a command below.");
      setListening(false);
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      if (!manualStopRef.current && voiceEnabled) {
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch (error) {
            setListening(false);
          }
        }, 200);
        return;
      }

      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      manualStopRef.current = true;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [setInterimTranscript, setListening, voiceEnabled]);

  const startListening = () => {
    if (!recognitionRef.current) {
      setStatusMessage(
        "Speech recognition is not available in this browser. Use Chrome or Edge, or type a command below."
      );
      return;
    }

    if (!voiceEnabled) {
      setVoiceEnabled(true);
    }

    manualStopRef.current = false;
    try {
      recognitionRef.current.start();
    } catch (error) {
      isListeningRef.current = false;
      setListening(false);
      setStatusMessage(
        "Microphone could not start. Close other tabs using speech input or type a command below."
      );
    }
  };

  const stopListening = () => {
    manualStopRef.current = true;
    resumeAfterSpeechRef.current = false;
    isListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterimTranscript("");
  };

  useEffect(() => {
    if (!voiceEnabled && isListening) {
      stopListening();
    }
  }, [isListening, voiceEnabled]);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    lastCommand,
    statusMessage,
    submitCommand: async (text) => {
      if (!text?.trim()) {
        return;
      }
      setStatusMessage("");
      await commandHandlerRef.current?.(text.trim());
    },
    startListening,
    stopListening,
    toggleListening: () => (isListening ? stopListening() : startListening()),
  };
}
