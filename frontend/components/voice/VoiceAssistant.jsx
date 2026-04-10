"use client";

import useVoiceEngine from "./useVoiceEngine";
import VoiceCommandPanel from "./VoiceCommandPanel";
import VoiceOrb from "./VoiceOrb";


export default function VoiceAssistant() {
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    lastCommand,
    statusMessage,
    submitCommand,
    toggleListening,
  } = useVoiceEngine();

  return (
    <>
      <VoiceCommandPanel
        transcript={transcript}
        interimTranscript={interimTranscript}
        lastCommand={lastCommand}
        isListening={isListening}
        isSupported={isSupported}
        statusMessage={statusMessage}
        onSubmitCommand={submitCommand}
      />
      <VoiceOrb isListening={isListening} onToggle={toggleListening} isSupported={isSupported} />
    </>
  );
}
