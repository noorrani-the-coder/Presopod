import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, CheckCircle2 } from 'lucide-react';
import AuthCard from '../components/AuthCard';
import ChatBot from '../components/ChatBot';
import { BASE_URL, uploadAndProcessPPT, regenerateAudio } from "./api";
import PresentationStage from "./PresentationStage";



// ---------------- Navbar ----------------
const Navbar = ({ onLoginClick, user, onLogout }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const initials = (user?.full_name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-10 py-6 backdrop-blur-md border-b border-white/10">
      <div className="text-2xl font-bold bg-gradient-to-r from-[#7F00FF] to-[#00C6FF] bg-clip-text text-transparent">
        SlideCast AI
      </div>
      <div className="hidden md:flex gap-8 text-gray-400 text-sm items-center">
        {user ? (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition text-white"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/30 border border-cyan-300/40 text-xs font-semibold">
                {initials}
              </span>
              <span className="max-w-[120px] truncate">{user.full_name}</span>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-12 w-72 rounded-2xl border border-white/15 bg-[#101727]/95 backdrop-blur-xl p-4 shadow-2xl">
                <p className="text-xs uppercase tracking-[0.12em] text-gray-400 mb-2">
                  Profile
                </p>
                <div className="space-y-1 mb-4">
                  <p className="text-white font-medium">{user.full_name}</p>
                  <p className="text-gray-300 text-xs">{user.email}</p>
                  <p className="text-gray-500 text-xs">User ID: {user.id}</p>
                </div>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-white text-sm"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            className="bg-white/10 px-6 py-2 rounded-full border border-white/20 hover:bg-white/20 transition text-white"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
};

// ---------------- Hero ----------------
const Hero = () => (
  <section className="pt-32 pb-20 px-6 text-center">
    
    <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent leading-tight">
      AI Platform for Smart Presentation <br /> & Podcast Generation
    </h1>
    <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
      Upload once. Present smarter. Listen anywhere. Your content, reimagined in seconds.
    </p>
  </section>
);



// ---------------- Processing Steps ----------------
const ProcessingSteps = ({ step }) => {
  const steps = ["Reading File", "Understanding Content", "Creating Slides"];
  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto my-12">
      {steps.map((s, i) => (
        <motion.div
          key={s}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: step >= i ? 1 : 0.3, x: step === i ? 10 : 0 }}
          className={`flex items-center gap-4 p-4 rounded-xl border ${
            step === i
              ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'border-white/5'
          }`}
        >
          {step > i
            ? <CheckCircle2 className="text-cyan-400" />
            : <div className="w-5 h-5 rounded-full border-2 border-gray-600" />}
          <span className={step === i ? "text-white font-medium" : "text-gray-500"}>
            {s}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

// ===================== MAIN APP =====================
export default function App() {
  const [file, setFile] = useState(null);
  const [slideCount, setSlideCount] = useState(5);
  const [presenterRole, setPresenterRole] = useState("teacher");
  const [voiceLang, setVoiceLang] = useState("en");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [teamPromptMode, setTeamPromptMode] = useState("none"); // none | confirm | input
  const [teamNamesInput, setTeamNamesInput] = useState("");
  const [teamSavedMessage, setTeamSavedMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
 const audioRef = useRef(new Audio());
  const [sessionData, setSessionData] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
const [mode, setMode] = useState("UPLOAD");

const [hasStarted, setHasStarted] = useState(false);


const [isPlaying, setIsPlaying] = useState(false);
  // Auth
  const [showAuth, setShowAuth] = useState(false);
  const [isSignIn, setIsSignIn] = useState(true);
  const [authUser, setAuthUser] = useState(null);

const currentAudioTypeRef = useRef(null); // "slide" | "example"

useEffect(() => {
  const rawUser = localStorage.getItem("slidecast_user");
  if (!rawUser) return;
  try {
    setAuthUser(JSON.parse(rawUser));
  } catch {
    localStorage.removeItem("slidecast_user");
    localStorage.removeItem("slidecast_token");
  }
}, []);

const handleAuthSuccess = ({ token, user }) => {
  localStorage.setItem("slidecast_token", token);
  localStorage.setItem("slidecast_user", JSON.stringify(user));
  setAuthUser(user);
  setShowAuth(false);
};

const handleLogout = () => {
  localStorage.removeItem("slidecast_token");
  localStorage.removeItem("slidecast_user");
  setAuthUser(null);
  setFile(null);
};

const toggleAudio = async () => {
  if (!audioRef.current || !audioRef.current.src) return;

  try {
    if (audioRef.current.paused) {
      // ✅ RESUME — continues from same time
      await audioRef.current.play();
      setIsPlaying(true);
    } else {
      // ⏸ PAUSE — keeps currentTime
      audioRef.current.pause();
      setIsPlaying(false);
    }
  } catch (err) {
    console.error("Audio toggle failed:", err);
  }
};

const stopAudio = () => {
  if (!audioRef.current) return;
  audioRef.current.pause();
  audioRef.current.currentTime = 0;
  audioRef.current.src = "";
  setIsPlaying(false);
  setHasStarted(false);
};

const pauseAudio = () => {
  if (!audioRef.current) return;
  if (!audioRef.current.paused) {
    audioRef.current.pause();
    setIsPlaying(false);
  }
};

const handleRegenerate = async (teamMembers = []) => {
  if (!sessionData?.session_id) return null;
  stopAudio();
  setIsRegenerating(true);
  try {
    const data = await regenerateAudio(
      sessionData.session_id,
      presenterRole,
      voiceLang,
      teamMembers
    );
    setSessionData(data);
    setCurrentSlideIndex(0);
    playSlide(0, true, data);
    return data;
  } catch (err) {
    if (err?.response?.status === 401) {
      handleLogout();
      setShowAuth(true);
      setIsSignIn(true);
    }
    console.error("Regenerate audio failed:", err);
    return null;
  } finally {
    setIsRegenerating(false);
  }
};

const detectTeamSlide = (slides) => {
  if (!slides || slides.length === 0) return false;
  const titleHasTeam = (t) =>
    /team|members|contributors|authors|our team/i.test(t || "");
  const looksLikeName = (text) => {
    if (!text) return false;
    const parts = text.replace("-", " ").trim().split(/\s+/);
    if (parts.length < 2 || parts.length > 4) return false;
    return parts.every((p) => /^[A-Z]/.test(p));
  };
  return slides.some((s) => {
    if (titleHasTeam(s.title)) return true;
    const bullets = s.bullets || [];
    return bullets.length >= 2 && bullets.every((b) => looksLikeName(b));
  });
};

const proceedToPresentation = (data) => {
  setMode("PRESENT");
  setTeamPromptMode("none");
  startPresentation(data || sessionData);
};






  // ---------------- Upload & Backend ----------------
  const handleUpload = async () => {
  if (!authUser) {
    setShowAuth(true);
    setIsSignIn(true);
    return;
  }
  if (!file) return;

  setIsProcessing(true);
  setCurrentStep(0);

  try {
    const data = await uploadAndProcessPPT(file, slideCount, presenterRole, voiceLang);

    setSessionData(data);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);
      if (step >= 3) {
        clearInterval(interval);
        if (detectTeamSlide(data.slides)) {
          setTeamPromptMode("confirm");
        } else {
          setTeamPromptMode("input");
        }
      }
    }, 1200);

  } catch (err) {
    const status = err?.response?.status;
    if (status === 401) {
      handleLogout();
      setShowAuth(true);
      setIsSignIn(true);
    }
    console.error("PPT upload failed:", err);
    setIsProcessing(false);
  }
};


  // ---------------- Presentation Logic ----------------
 const startPresentation = (data = null) => {
  const slides = data?.slides || sessionData?.slides;
  if (slides && slides.length > 0) {
    playSlide(0, true, data);
  }
};


  const enterFullscreen = () => {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }
};

const audioQueueRef = useRef([]);
const currentAudioIndexRef = useRef(0);


const playSlide = (index, shouldAutoplay = false, dataOverride = null) => {
  if (isRegenerating) return;
  const session = dataOverride || sessionData;
  if (!session) return;
  setCurrentSlideIndex(index);

  const slide = session.slides[index];
  if (!slide?.audio?.slide) {
    console.warn("No slide audio for slide", index);
    return;
  }

  setCurrentSlideIndex(index);

  const slideAudio = slide.audio.slide;
  const exampleAudio = slide.audio.example;
  const titleHasTeam = /team|members|contributors|authors|our team/i.test(slide?.title || "");
  const looksLikeName = (text) => {
    if (!text) return false;
    const parts = text.replace("-", " ").trim().split(/\s+/);
    if (parts.length < 2 || parts.length > 4) return false;
    return parts.every((p) => /^[A-Z]/.test(p));
  };
  const bullets = slide?.bullets || [];
  const isTeamSlide = titleHasTeam || (bullets.length >= 2 && bullets.every((b) => looksLikeName(b)));

  const playAudio = (url, onEnd) => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    audioRef.current.src = `${BASE_URL}${url}`;
    audioRef.current.load();

    audioRef.current.onended = onEnd;

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setHasStarted(true);
      })
      .catch(err => console.error("Audio play failed:", err));
  };

  if (!shouldAutoplay) return;

  // ▶️ 1. Play slide narration
  playAudio(slideAudio, () => {
    console.log("Slide audio ended");

    // ▶️ 2. Play example audio (ONLY if it exists and not a team slide)
    if (exampleAudio && !isTeamSlide) {
      console.log("Playing example audio:", exampleAudio);

      playAudio(exampleAudio, () => {
        console.log("Example audio ended");
        goNext(index);
      });
    } else {
      console.log(isTeamSlide ? "Team slide: skipping example audio" : "No example audio, moving to next slide");
      goNext(index);
    }
  });
};








const goNext = (index) => {
  const nextIndex = index + 1;
  if (nextIndex < sessionData.slides.length) {
    playSlide(nextIndex, true);
  } else {
    setIsPlaying(false);
    console.log("Presentation finished");
  }
};




  




  // Keyboard controls (optional but professional)
  useEffect(() => {
    const handler = (e) => {
      if (!sessionData) return;

      if (e.key === " ") audioRef.current?.pause();
      if (e.key === "ArrowRight") {
        const next = currentSlideIndex + 1;
        if (next < sessionData.slides.length) {
          playSlide(next, sessionData);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sessionData, currentSlideIndex]);

  if (mode === "PRESENT" && sessionData) {
  return (
    <PresentationStage
  sessionData={sessionData}
  currentSlideIndex={currentSlideIndex}
  toggleAudio={toggleAudio}
  isPlaying={isPlaying}
  playSlide={playSlide}
  hasStarted={hasStarted}   // 👈 ADD THIS
  presenterRole={presenterRole}
  setPresenterRole={setPresenterRole}
  voiceLang={voiceLang}
  setVoiceLang={setVoiceLang}
  isRegenerating={isRegenerating}
  onRegenerate={handleRegenerate}
  onPauseAudio={pauseAudio}
  onBack={() => {
    stopAudio();
    setCurrentSlideIndex(0);
    setSessionData(null);
    setMode("UPLOAD");
  }}
/>

  );
}

  // ===================== UI =====================
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white selection:bg-purple-500/30 font-sans relative overflow-x-hidden">

      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />

      <Navbar
        onLoginClick={() => setShowAuth(true)}
        user={authUser}
        onLogout={handleLogout}
      />

      <AnimatePresence>
        {showAuth && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md">
            <AuthCard
              isSignIn={isSignIn}
              setIsSignIn={setIsSignIn}
              onClose={() => setShowAuth(false)}
              onAuthSuccess={handleAuthSuccess}
            />
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto relative z-10">
        <Hero />

        {/* Upload Section */}
        <section className="px-6 pb-20">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="max-w-3xl mx-auto p-12 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl flex flex-col items-center border-dashed cursor-pointer"
            onClick={() => authUser && !file && document.getElementById('fileInput').click()}
          >
            <input
              type="file"
              id="fileInput"
              accept=".ppt,.pptx,.pdf" 
              className="hidden"
              onChange={(e) => setFile(e.target.files[0])}
            />

            <div className="w-20 h-20 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
              <Upload className="text-cyan-400" size={32} />
            </div>

            <h3 className="text-xl font-semibold mb-2">
              {file ? file.name : "Drag & Drop PDF or PPT"}
            </h3>

            <p className="text-gray-500 mb-8 text-center">
              Max file size 25MB. Supports multi-page academic PDFs.
            </p>

            {!authUser && (
              <div className="mb-6 w-full max-w-xl rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-center">
                <p className="text-sm text-cyan-100 mb-3">
                  Please login to upload and generate your presentation.
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAuth(true);
                    setIsSignIn(true);
                  }}
                  className="px-5 py-2 rounded-lg bg-cyan-500/80 hover:bg-cyan-500 transition text-white text-sm font-medium"
                >
                  Login to Continue
                </button>
              </div>
            )}

            {authUser && (
              <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-black/20 p-5 md:p-6">
                <h4 className="text-sm uppercase tracking-[0.14em] text-gray-400 mb-5">
                  Presentation Setup
                </h4>

                <div className="mb-5">
                  <label className="block text-xs uppercase tracking-[0.12em] text-gray-400 mb-2">
                    Slide Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={slideCount}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setSlideCount(e.target.value)}
                    className="w-full md:w-36 text-center bg-black/30 border border-white/10 rounded-lg py-2.5 text-white"
                  />
                </div>

                <div className="mb-5">
                  <p className="text-xs uppercase tracking-[0.12em] text-gray-400 mb-2">
                    Presenter Role
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[
                      { value: "teacher", label: "Teacher" },
                      { value: "student", label: "Student Presenter" },
                      { value: "company", label: "Company Presenter" }
                    ].map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPresenterRole(role.value);
                        }}
                        className={`px-4 py-2 rounded-lg border text-sm text-center transition ${
                          presenterRole === role.value
                            ? "border-cyan-400 bg-cyan-400/20 text-white"
                            : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-1">
                  <p className="text-xs uppercase tracking-[0.12em] text-gray-400 mb-2">
                    Voice Language
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "en", label: "English" },
                      { value: "ta", label: "Tamil" }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVoiceLang(opt.value);
                        }}
                        className={`px-4 py-2 rounded-lg border text-sm text-center transition ${
                          voiceLang === opt.value
                            ? "border-cyan-400 bg-cyan-400/20 text-white"
                            : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {authUser && file && !isProcessing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  enterFullscreen();
                  handleUpload();
                }}
                className="mt-6 bg-white text-black px-10 py-3 rounded-full font-bold hover:bg-cyan-400 transition transform hover:scale-105"
              >
                Start AI Magic
              </button>
            )}


          </motion.div>

          {isProcessing && <ProcessingSteps step={currentStep} />}
        </section>
      </main>

      {teamPromptMode !== "none" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0B0F1A] p-6">
            {teamPromptMode === "confirm" ? (
              <>
                <h3 className="text-lg font-semibold mb-2">Team Slide Detected</h3>
                <p className="text-sm text-gray-400 mb-4">
                  We detected a team members slide. Do you want to use it?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => proceedToPresentation(sessionData)}
                    className="flex-1 py-2 rounded-xl bg-cyan-500/80 hover:bg-cyan-500 transition"
                  >
                    Yes, use it
                  </button>
                  <button
                    onClick={() => setTeamPromptMode("input")}
                    className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                  >
                    No, add names
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">Add Team Members</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Enter names separated by commas (e.g. Arun, Priya, Karthik).
                </p>
                <input
                  value={teamNamesInput}
                  onChange={(e) => setTeamNamesInput(e.target.value)}
                  placeholder="Team members"
                  className="w-full mb-4 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white"
                />
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      const names = teamNamesInput
                        .split(",")
                        .map((n) => n.trim())
                        .filter(Boolean);
                      if (names.length > 0) {
                        setTeamSavedMessage("Saved!");
                        await handleRegenerate(names);
                        setTimeout(() => {
                          setMode("PRESENT");
                          setTeamPromptMode("none");
                          setTeamNamesInput("");
                          setTeamSavedMessage("");
                        }, 800);
                        return;
                      }
                      proceedToPresentation(sessionData);
                    }}
                    className="flex-1 py-2 rounded-xl bg-cyan-500/80 hover:bg-cyan-500 transition"
                  >
                    Save & Continue
                  </button>
                  <button
                    onClick={() => proceedToPresentation(sessionData)}
                    className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                  >
                    Skip
                  </button>
                </div>
                {teamSavedMessage && (
                  <div className="mt-3 text-sm text-cyan-300">
                    {teamSavedMessage}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <ChatBot />
    </div>
  );
}
