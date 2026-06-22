import { useEffect, useRef, useState, useCallback } from "react";
import * as Tone from "tone";

export function useSound(soundOn) {
  const synth = useRef(null);
  useEffect(() => {
    synth.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle4" },
      envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.25 },
      volume: -10,
    }).toDestination();
    return () => synth.current?.dispose();
  }, []);
  return useCallback(async (note = "C5", dur = "32n") => {
    if (!soundOn) return;
    await Tone.start();
    synth.current?.triggerAttackRelease(note, dur);
  }, [soundOn]);
}

export function useCompactDetect() {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(max-width: 640px)").matches : false
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = (e) => setMatches(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);
  return matches;
}
