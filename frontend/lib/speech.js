"use client";


const FEMALE_VOICE_HINTS = [
  "female",
  "zira",
  "samantha",
  "victoria",
  "aria",
  "karen",
  "google us english",
  "michelle",
];

let activeUtterance = null;


const dispatchSpeechEvent = (eventName, detail = {}) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};


const getVoices = () =>
  new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }

    const handleVoicesChanged = () => {
      resolve(window.speechSynthesis.getVoices());
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };

    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
  });


export const pickPreferredVoice = async () => {
  const voices = await getVoices();
  if (!voices.length) {
    return null;
  }

  return (
    voices.find((voice) =>
      FEMALE_VOICE_HINTS.some((hint) => voice.name.toLowerCase().includes(hint))
    ) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
    voices[0]
  );
};


export const stopSpeaking = () => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  if (activeUtterance) {
    dispatchSpeechEvent("voicemart:speech-end", {
      text: activeUtterance.text,
      interrupted: true,
    });
    activeUtterance = null;
  }

  window.speechSynthesis.cancel();
};


export const speakText = async (text, options = {}) => {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    !text ||
    typeof text !== "string"
  ) {
    return;
  }

  stopSpeaking();
  dispatchSpeechEvent("voicemart:speech-start", { text });
  const utterance = new SpeechSynthesisUtterance(text);
  activeUtterance = utterance;
  const preferredVoice = await pickPreferredVoice();

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.rate = options.rate || 1;
  utterance.pitch = options.pitch || 1.06;
  utterance.volume = 1;
  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    dispatchSpeechEvent("voicemart:speech-end", { text, interrupted: false });
  };
  utterance.onerror = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    dispatchSpeechEvent("voicemart:speech-end", { text, interrupted: true });
  };

  window.speechSynthesis.speak(utterance);
};
