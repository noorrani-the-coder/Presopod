export default function Sidebar({ slides, current, setCurrent }) {
  return (
    <div className="w-64 bg-black/80 p-4 space-y-2">
      {slides.map((_, i) => (
        <button
          key={i}
          onClick={() => setCurrent(i)}
          className={`w-full p-2 rounded text-left ${
            current === i ? "bg-cyan-600" : "bg-white/10"
          }`}
        >
          Slide {i + 1}
        </button>
      ))}
    </div>
  );
}
