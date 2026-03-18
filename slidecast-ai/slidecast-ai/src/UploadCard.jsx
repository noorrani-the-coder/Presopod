export default function UploadCard() {
  return (
    <section className="py-16 flex justify-center">
      <div className="w-full max-w-xl bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
        <h3 className="text-xl font-semibold mb-4">Upload your PDF</h3>

        <div className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center text-gray-400 hover:border-purple-400 transition">
          Drag & drop your PDF or PPT here <br /> or click to browse
        </div>

        <div className="flex gap-4 mt-6">
          <button className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500">
            Generate Presentation
          </button>
          <button className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20">
            Generate Podcast
          </button>
        </div>
      </div>
    </section>
  );
}
