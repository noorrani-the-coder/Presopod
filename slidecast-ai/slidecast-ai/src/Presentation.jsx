import { useEffect, useState } from "react";
import useAudioPlayer from "./hooks/useAudioPlayer";
import { askQuestion } from "./api";
import SlideCanvas from "./SlideCanvas";
import Sidebar from "./Sidebar";

export default function Presentation({ data }) {
  const { playAudio, pause, resume } = useAudioPlayer();

  const [current, setCurrent] = useState(0);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");

  const slide = data.slides[current];

  // 🔊 Play narration when slide changes
  useEffect(() => {
    if (!slide?.audio) return;

    playAudio(slide.audio);

    return () => pause();
  }, [current]);

  // 🖥 Fullscreen once
  useEffect(() => {
    document.documentElement.requestFullscreen();
    return () => document.exitFullscreen();
  }, []);

  // ❓ Ask AI
  const handleAsk = async () => {
    pause();

    const res = await askQuestion(data.session_id, question);

    const utter = new SpeechSynthesisUtterance(res.answer);
    speechSynthesis.speak(utter);

    setAsking(false);
    setQuestion("");
  };

  return (
    <div className="h-screen flex bg-black text-white">
      {/* LEFT: Slide Thumbnails */}
      <Sidebar
        slides={data.slides}
        current={current}
        setCurrent={setCurrent}
      />

      {/* CENTER: Slide Canvas */}
      <SlideCanvas slide={slide} />

      {/* TOP-RIGHT CONTROLS */}
      <div className="fixed top-6 right-6 flex gap-4">
        <button onClick={pause} className="px-4 py-2 bg-white/10 rounded">
          Pause
        </button>
        <button onClick={resume} className="px-4 py-2 bg-white/10 rounded">
          Resume
        </button>
        <button
          onClick={() => setCurrent(c => c + 1)}
          disabled={current >= data.slides.length - 1}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded"
        >
          Next
        </button>
        <button
          onClick={() => {
            pause();
            setAsking(true);
          }}
          className="px-4 py-2 bg-white/10 rounded"
        >
          Ask
        </button>
      </div>

      {/* Q&A PANEL */}
      {asking && (
        <div className="fixed bottom-8 bg-white/10 p-6 rounded-xl w-1/2 left-1/4">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask your question..."
            className="w-full p-3 bg-black/30 rounded mb-4"
          />
          <button
            onClick={handleAsk}
            className="w-full py-2 bg-cyan-500 rounded"
          >
            Ask AI
          </button>
        </div>
      )}
    </div>
  );
}
