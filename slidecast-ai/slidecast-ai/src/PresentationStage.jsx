import { motion } from "framer-motion";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  askQuestion,
  deletePresentationNote,
  downloadPresentation,
  downloadPresentationNotes,
  downloadPresentationSummary,
  getPresentationNotes,
  getPresentationSummary,
  savePresentationNote,
} from "./api";
import SlideTemplate from "../components/SlideTemplate";
import ThemeSelector from "../components/ThemeSelector";
import { PPT_THEMES } from "./themes/themes";

export default function PresentationStage({
  sessionData,
  currentSlideIndex,
  playSlide,
  toggleAudio,
  isPlaying,
  hasStarted,
  onBack,
  presenterRole,
  setPresenterRole,
  voiceLang,
  setVoiceLang,
  onRegenerate,
  isRegenerating,
  onPauseAudio,
}) {
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const [theme, setTheme] = useState(PPT_THEMES[0]);

  const [notesBySlide, setNotesBySlide] = useState({});
  const [currentNote, setCurrentNote] = useState("");
  const [selectedNoteKey, setSelectedNoteKey] = useState(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingNotes, setIsDownloadingNotes] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [summaryPoints, setSummaryPoints] = useState([]);
  const [isDownloadingSummary, setIsDownloadingSummary] = useState(false);

  const recognitionRef = useRef(null);
  const isSupported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!isSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = voiceLang === "ta" ? "ta-IN" : "en-US";
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = async (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = (last[0]?.transcript || "").trim();
      if (!transcript) return;
      setLastHeard(transcript);
      const lower = transcript.toLowerCase();

      const pauseKeywords = voiceLang === "ta" ? ["pause", "stop", "நிறுத்து"] : ["pause", "stop"];
      if (pauseKeywords.some((k) => lower.includes(k))) {
        onPauseAudio?.();
        return;
      }

      const looksLikeQuestion =
        lower.startsWith("ask ") ||
        lower.startsWith("question ") ||
        lower.startsWith("what ") ||
        lower.startsWith("why ") ||
        lower.startsWith("how ") ||
        lower.startsWith("when ") ||
        lower.startsWith("where ") ||
        lower.startsWith("who ") ||
        lower.endsWith("?") ||
        (voiceLang === "ta" && lower.startsWith("கேள் ")) ||
        (voiceLang === "ta" && lower.startsWith("என்ன ")) ||
        (voiceLang === "ta" && lower.startsWith("ஏன் ")) ||
        (voiceLang === "ta" && lower.startsWith("எப்படி ")) ||
        (voiceLang === "ta" && lower.startsWith("எப்போது ")) ||
        (voiceLang === "ta" && lower.startsWith("எங்கே ")) ||
        (voiceLang === "ta" && lower.startsWith("யார் "));

      if (!looksLikeQuestion) return;

      const q = transcript
        .replace(/^ask\s+/i, "")
        .replace(/^question\s+/i, "")
        .replace(/^கேள்\s+/i, "")
        .trim();
      if (!q) return;

      onPauseAudio?.();

      try {
        if (!sessionData?.session_id) {
          throw new Error("Session expired. Please re-upload.");
        }
        const res = await askQuestion(sessionData.session_id, q);
        const utter = new SpeechSynthesisUtterance(res.answer || "Sorry, I do not know.");
        utter.lang = voiceLang === "ta" ? "ta-IN" : "en-US";
        speechSynthesis.speak(utter);
      } catch (err) {
        console.error("Voice Q&A failed:", err);
        const msg = err?.message || "Sorry, I could not answer right now.";
        const utter = new SpeechSynthesisUtterance(msg);
        utter.lang = voiceLang === "ta" ? "ta-IN" : "en-US";
        speechSynthesis.speak(utter);
      }
    };

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [isSupported, onPauseAudio, sessionData, voiceLang]);

  useEffect(() => {
    if (!isSupported) return;
    if (isRegenerating && isListening) {
      recognitionRef.current?.stop();
    }
  }, [isRegenerating, isListening, isSupported]);

  useEffect(() => {
    const sessionId = sessionData?.session_id;
    if (!sessionId) return;

    let active = true;
    const load = async () => {
      try {
        const [notesRes, summaryRes] = await Promise.all([
          getPresentationNotes(sessionId),
          getPresentationSummary(sessionId),
        ]);
        if (!active) return;

        const mapped = {};
        (notesRes?.notes || []).forEach((n) => {
          if (!mapped[n.slide_index]) mapped[n.slide_index] = [];
          mapped[n.slide_index].push(n);
        });
        setNotesBySlide(mapped);
        setSummaryPoints(summaryRes?.summary_points || []);
      } catch (err) {
        console.error("Failed to load notes/summary:", err);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [sessionData?.session_id]);

  useEffect(() => {
    setSelectedNoteKey(null);
    setCurrentNote("");
  }, [currentSlideIndex, notesBySlide]);

  const slide = sessionData.slides[currentSlideIndex];
  const currentSlideNotes = notesBySlide[currentSlideIndex] || [];
  const selectedNote = currentSlideNotes.find(
    (n) => (n.id || `${n.note_order}-${n.note_label}`) === selectedNoteKey
  );

  const handleSaveNote = async () => {
    if (!sessionData?.session_id) return;
    if (!currentNote.trim()) return;
    setIsSavingNote(true);
    try {
      const saved = await savePresentationNote(sessionData.session_id, currentSlideIndex, currentNote.trim());
      setNotesBySlide((prev) => {
        const existing = prev[currentSlideIndex] || [];
        return { ...prev, [currentSlideIndex]: [...existing, saved] };
      });
      setSelectedNoteKey(saved.id || `${saved.note_order}-${saved.note_label}`);
      setCurrentNote("");
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDownloadNotes = async () => {
    if (!sessionData?.session_id) return;
    setIsDownloadingNotes(true);
    try {
      const blob = await downloadPresentationNotes(sessionData.session_id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `notes_${sessionData.session_id}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Notes download failed:", err);
    } finally {
      setIsDownloadingNotes(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!sessionData?.session_id || !noteId) return;
    try {
      await deletePresentationNote(sessionData.session_id, noteId);
      setNotesBySlide((prev) => {
        const existing = prev[currentSlideIndex] || [];
        const updated = existing.filter((n) => n.id !== noteId);
        return { ...prev, [currentSlideIndex]: updated };
      });
      if (selectedNoteKey === noteId) {
        setSelectedNoteKey(null);
        setCurrentNote("");
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const handleDownload = async () => {
    if (!sessionData?.session_id) return;
    setIsDownloading(true);
    try {
      const blob = await downloadPresentation(sessionData.session_id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `slidecast_${sessionData.session_id}.pptx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSummary = async () => {
    if (!sessionData?.session_id) return;
    setIsDownloadingSummary(true);
    try {
      const blob = await downloadPresentationSummary(sessionData.session_id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `summary_${sessionData.session_id}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Summary download failed:", err);
    } finally {
      setIsDownloadingSummary(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,#172554_0%,#020617_55%,#01030a_100%)] text-white flex overflow-hidden">
      {isRegenerating && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            Regenerating audio...
          </div>
        </div>
      )}

      <aside
        className="w-72 bg-black/35 border-r border-white/10 p-4 md:p-5 overflow-y-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <button
          onClick={onBack}
          className="mb-5 w-full text-left px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
        >
          Back
        </button>

        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <h3 className="mb-2 text-[11px] uppercase tracking-[0.14em] text-gray-400">Presenter Role</h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              { value: "teacher", label: "Teacher" },
              { value: "student", label: "Student Presenter" },
              { value: "company", label: "Company Presenter" },
            ].map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => setPresenterRole(role.value)}
                className={`w-full text-left px-4 py-2 rounded-lg transition ${
                  presenterRole === role.value
                    ? "bg-cyan-500/20 border border-cyan-400 text-white"
                    : "bg-white/5 hover:bg-white/10 text-gray-300"
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <h3 className="mb-2 text-[11px] uppercase tracking-[0.14em] text-gray-400">Voice</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "en", label: "English" },
              { value: "ta", label: "Tamil" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVoiceLang(opt.value)}
                className={`w-full text-center px-3 py-2 rounded-lg transition ${
                  voiceLang === opt.value
                    ? "bg-cyan-500/20 border border-cyan-400 text-white"
                    : "bg-white/5 hover:bg-white/10 text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <h3 className="mb-2 text-[11px] uppercase tracking-[0.14em] text-gray-400">Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                if (!isSupported || isRegenerating) return;
                try {
                  if (isListening) recognitionRef.current?.stop();
                  else recognitionRef.current?.start();
                } catch (err) {
                  console.error("Voice start failed:", err);
                }
              }}
              className={`w-full text-left px-4 py-2 rounded-lg transition ${
                isListening ? "bg-cyan-500/20 border border-cyan-400" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {isListening ? "Listening..." : "Start Voice"}
            </button>
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className={`w-full text-left px-4 py-2 rounded-lg transition ${
                isRegenerating ? "bg-white/5 text-gray-400 cursor-not-allowed" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {isRegenerating ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Regenerating...
                </span>
              ) : (
                "Re-generate Audio"
              )}
            </button>
          </div>
        </div>

        {!isSupported && <div className="mb-6 text-xs text-red-400">Voice recognition is not supported in this browser.</div>}
        {lastHeard && <div className="mb-6 text-xs text-gray-400">Heard: {lastHeard}</div>}

        <h3 className="text-sm text-gray-400 mb-3 mt-5 uppercase tracking-wide">Slides</h3>
        <div className="space-y-2">
          {sessionData.slides.map((_, i) => (
            <button
              key={i}
              onClick={() => playSlide(i, true)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                i === currentSlideIndex
                  ? "bg-purple-600/90 border-purple-400/60 text-white shadow-[0_8px_24px_rgba(168,85,247,0.35)]"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              Slide {i + 1}
            </button>
          ))}
        </div>
      </aside>

      <main
        className="flex-1 flex flex-col items-center justify-start relative px-6 md:px-8 overflow-y-auto pb-28 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="absolute top-5 left-6 right-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-gray-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Presentation
            </div>
            <button
              onClick={() => {
                if (isRegenerating) return;
                if (isPlaying) {
                  toggleAudio();
                } else if (hasStarted) {
                  toggleAudio();
                } else {
                  playSlide(currentSlideIndex, true);
                }
              }}
              disabled={isRegenerating}
              className={`rounded-lg border border-white/20 px-3 py-2 text-sm font-medium ${
                isRegenerating ? "bg-white/5 text-gray-400 cursor-not-allowed" : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              {isPlaying ? "Pause Podcast" : "Play Podcast"}
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setActivePanel((prev) => (prev === "notes" ? null : "notes"))}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                activePanel === "notes"
                  ? "border-cyan-400/50 bg-cyan-500/20 text-white"
                  : "border-white/15 bg-white/10 text-gray-200 hover:bg-white/20"
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActivePanel((prev) => (prev === "summary" ? null : "summary"))}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                activePanel === "summary"
                  ? "border-cyan-400/50 bg-cyan-500/20 text-white"
                  : "border-white/15 bg-white/10 text-gray-200 hover:bg-white/20"
              }`}
            >
              Summary
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-60"
            >
              {isDownloading ? "Downloading..." : "Download PPT"}
            </button>
            <ThemeSelector selected={theme} onChange={setTheme} />
          </div>
        </div>

        <div className="mt-20 flex w-full flex-col items-center gap-4">
          {!isRegenerating && (
            <motion.div
              key={currentSlideIndex}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: activePanel ? 0.9 : 1 }}
              transition={{ duration: 0.2 }}
              style={{ transformOrigin: "top center" }}
              className="rounded-2xl border border-white/10 bg-[#020617]/60 p-3 shadow-[0_24px_60px_rgba(2,6,23,0.55)]"
            >
              <SlideTemplate slide={slide} theme={theme} index={currentSlideIndex} total={sessionData.slides.length} />
            </motion.div>
          )}

          {activePanel && (
            <aside
              className="w-full max-w-[960px] rounded-2xl border border-white/10 bg-[#060d1f]/90 backdrop-blur-md p-4"
            >
            <div className="mb-3 flex items-center justify-end">
              <button
                onClick={() => setActivePanel(null)}
                className="h-7 w-7 rounded-md border border-white/15 bg-white/10 text-gray-200 hover:bg-white/20"
                aria-label="Close panel"
                title="Close"
              >
                X
              </button>
            </div>
            {activePanel === "notes" ? (
            <>
              <h3 className="text-xs uppercase tracking-[0.12em] text-gray-400 mb-2">Notes</h3>
              <p className="text-xs text-gray-500 mb-2">Slide {currentSlideIndex + 1}</p>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-cyan-300">
                  {selectedNote?.note_label || `Note ${currentSlideNotes.length + 1}`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNoteKey(null);
                    setCurrentNote("");
                  }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-cyan-400/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                  title="Add new note"
                  aria-label="Add new note"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="Write your notes for this slide..."
                className="w-full h-24 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/30"
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  className="w-full rounded-lg bg-cyan-500/80 hover:bg-cyan-500 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isSavingNote ? "Saving..." : "Save Note"}
                </button>
                <button
                  onClick={handleDownloadNotes}
                  disabled={isDownloadingNotes}
                  className="w-full rounded-lg bg-white/10 hover:bg-white/20 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isDownloadingNotes ? "Downloading..." : "Download Notes"}
                </button>
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2 max-h-32 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {currentSlideNotes.length > 0 ? (
                  <div className="space-y-2">
                    {currentSlideNotes.map((n) => {
                      const key = n.id || `${n.note_order}-${n.note_label}`;
                      const active = key === selectedNoteKey;
                      return (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNoteKey(key);
                          setCurrentNote(n.note_text || "");
                        }}
                        key={key}
                        className={`w-full text-left rounded-md border p-2 transition ${
                          active ? "border-cyan-400/60 bg-cyan-500/10" : "border-white/10 hover:bg-white/5"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-[11px] text-cyan-300">{n.note_label || `Note ${n.note_order}`}</p>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(n.id);
                            }}
                            className="rounded px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-500/20"
                          >
                            Delete
                          </span>
                        </div>
                        <p className="text-xs text-gray-200 whitespace-pre-wrap">{n.note_text}</p>
                      </button>
                    )})}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No notes saved for this slide.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xs uppercase tracking-[0.12em] text-gray-400 mb-2">Presentation Summary</h3>
              <div className="mb-3 rounded-lg border border-white/10 bg-black/20 p-3 max-h-32 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {(summaryPoints || []).length > 0 ? (
                  <ul className="space-y-1 text-xs text-gray-300">
                    {summaryPoints.map((p, i) => (
                      <li key={i}>• {p}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">No summary points yet.</p>
                )}
              </div>
              <button
                onClick={handleDownloadSummary}
                disabled={isDownloadingSummary}
                className="w-full rounded-lg bg-white/10 hover:bg-white/20 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isDownloadingSummary ? "Downloading..." : "Download Summary"}
              </button>
            </>
          )}
            </aside>
          )}
        </div>

      </main>
    </div>
  );
}
