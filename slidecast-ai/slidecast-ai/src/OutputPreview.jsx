export default function OutputPreview() {
  return (
    <section className="px-8 py-20 grid md:grid-cols-2 gap-10">
      {/* Slides */}
      <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
        <h4 className="font-semibold mb-4">Presentation Preview</h4>
        <div className="space-y-3">
          <div className="h-16 bg-white/10 rounded-lg"></div>
          <div className="h-16 bg-white/10 rounded-lg"></div>
          <div className="h-16 bg-white/10 rounded-lg"></div>
        </div>
        <button className="mt-4 w-full py-2 rounded-lg bg-white/20">
          Download PPT
        </button>
      </div>

      {/* Podcast */}
      <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
        <h4 className="font-semibold mb-4">Podcast</h4>
        <div className="h-24 bg-white/10 rounded-lg flex items-center justify-center">
          🎧 Audio Waveform
        </div>
        <button className="mt-4 w-full py-2 rounded-lg bg-white/20">
          Download Audio
        </button>
      </div>
    </section>
  );
}
