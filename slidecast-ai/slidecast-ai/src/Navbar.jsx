export default function Navbar() {
  return (
    <nav className="flex justify-between items-center px-6 py-5 border-b border-white/10">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
        SmartPDF AI
      </h1>
      <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
        Get Started
      </button>
    </nav>
  );
}
