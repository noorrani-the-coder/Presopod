import { useRef } from "react";
import { BASE_URL } from "../api";

export default function useAudioPlayer() {
  const audioRef = useRef(null);

  const playAudio = (path, onEnd) => {
    audioRef.current?.pause();

    const audio = new Audio(`${BASE_URL}${path}`);
    audioRef.current = audio;
    audio.play();

    if (onEnd) audio.onended = onEnd;
  };

  const pause = () => audioRef.current?.pause();
  const resume = () => audioRef.current?.play();

  return { playAudio, pause, resume };
}
