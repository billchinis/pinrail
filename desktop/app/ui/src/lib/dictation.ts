// Dictating a note: the web view's speech recognition, which in the macOS
// app is Apple's. Where the web view has none, such as on Linux, the note
// box shows no button for it.

import { useCallback, useEffect, useRef, useState } from "react";

type Result = { 0: { transcript: string }; isFinal: boolean };
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<Result> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionClass = new () => Recognition;

const Recognizer: RecognitionClass | undefined =
  typeof window === "undefined"
    ? undefined
    : ((window as unknown as Record<string, RecognitionClass | undefined>).SpeechRecognition ??
      (window as unknown as Record<string, RecognitionClass | undefined>).webkitSpeechRecognition);

/** Whether this window can turn speech into text. */
export const canDictate = !!Recognizer;

/** What to tell the person when recognition stops with an error, or null when there is nothing to say. */
export function dictationError(error: string): string | null {
  switch (error) {
    case "aborted":
    case "no-speech":
      return null;
    case "not-allowed":
    case "service-not-allowed":
      return "Pinrail may not use the microphone or speech recognition. Allow both in System Settings › Privacy & Security.";
    case "audio-capture":
      return "No microphone was found.";
    case "network":
      return "Speech recognition needs a network connection.";
    default:
      return `Dictation stopped: ${error}.`;
  }
}

/**
 * Turns speech into text after what the field holds. While it listens,
 * `onText` receives the field's text with what has been said so far, and
 * `onError` a message when recognition fails.
 */
export function useDictation(onText: (text: string) => void, onError: (message: string) => void) {
  const [listening, setListening] = useState(false);
  const current = useRef<Recognition | null>(null);
  const handlers = useRef({ onText, onError });
  handlers.current = { onText, onError };

  const stop = useCallback(() => current.current?.stop(), []);
  const start = useCallback((before: string) => {
    if (!Recognizer || current.current) return;
    const recognition = new Recognizer();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language;
    const lead = before && !/\s$/.test(before) ? `${before} ` : before;
    recognition.onresult = (event) => {
      let said = "";
      for (let i = 0; i < event.results.length; i++) said += event.results[i][0].transcript;
      handlers.current.onText(lead + said.trimStart());
    };
    recognition.onerror = (event) => {
      const message = dictationError(event.error);
      if (message) handlers.current.onError(message);
    };
    recognition.onend = () => {
      current.current = null;
      setListening(false);
    };
    current.current = recognition;
    recognition.start();
    setListening(true);
  }, []);
  // leaving the review stops listening
  useEffect(() => () => current.current?.abort(), []);
  return { listening, start, stop };
}
