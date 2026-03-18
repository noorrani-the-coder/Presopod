import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="grid md:grid-cols-2 gap-12 py-20 items-center">
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <h2 className="text-5xl font-bold leading-tight">
          Turn PDFs into{" "}
          <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Slides & Podcasts
          </span>
        </h2>

        <p className="text-gray-400 mt-6 max-w-md">
          Upload once. Let AI generate presentations and podcasts in minutes.
        </p>

        <div className="flex gap-4 mt-8">
          <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500">
            Generate Slides
          </button>
          <button className="px-6 py-3 rounded-xl border border-white/20 hover:bg-white/10">
            Generate Podcast
          </button>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ repeat: Infinity, duration: 3 }}
        className="bg-white/10 rounded-2xl h-72 flex items-center justify-center backdrop-blur-xl"
      >
        🤖 AI Engine
      </motion.div>
    </section>
  );
}
