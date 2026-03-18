const steps = [
  "Reading PPT",
  "Understanding Content",
  "Creating Slides",
  "Recording Podcast",
];

export default function ProcessingSteps() {
  return (
    <section className="px-8 py-12">
      <h3 className="text-center text-xl font-semibold mb-8">
        AI at Work
      </h3>
      <div className="flex justify-center gap-6 flex-wrap">
        {steps.map((step, i) => (
          <div
            key={i}
            className="px-6 py-4 rounded-xl bg-white/10 border border-white/20"
          >
            {step}
          </div>
        ))}
      </div>
    </section>
  );
}
