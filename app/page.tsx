import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { PalmWiseLogo } from "@/components/PalmWiseLogo";

const ARCHETYPES = [
  {
    name: "The Builder",
    color: "#F59E0B",
    desc: "Methodical, dependable, and driven by tangible results.",
  },
  {
    name: "The Visionary",
    color: "#8B5CF6",
    desc: "Intuitive, forward-thinking, and drawn to big ideas.",
  },
  {
    name: "The Explorer",
    color: "#3B82F6",
    desc: "Curious, adaptable, and fuelled by discovery.",
  },
  {
    name: "The Guardian",
    color: "#10B981",
    desc: "Empathetic, protective, and deeply loyal.",
  },
  {
    name: "The Creator",
    color: "#EC4899",
    desc: "Expressive, imaginative, and compelled to make.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Nav */}
        <nav className="border-b border-gray-900 px-6 py-4 flex items-center justify-between">
          <PalmWiseLogo />
          <div className="flex items-center gap-4">
          <Link
            href="/history"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            My Readings
          </Link>
          <ConnectButton />
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block px-3 py-1 rounded-full text-xs border border-[#19D184]/30 text-[#19D184] mb-6">
          Powered by Ritual Chain · On-chain AI · Private readings
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-5 leading-tight">
          Discover Your{" "}
          <span className="text-[#19D184]">Palm Archetype</span>
        </h1>
        <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
          Upload a photo of your palm. AI analyzes your lines, shape, and
          proportions and generates a private, on-chain personality reading —
          encrypted to you alone.
        </p>
        <Link
          href="/scan"
          className="inline-block px-8 py-4 rounded-xl bg-[#19D184] text-black font-bold text-lg hover:bg-[#16c077] transition-colors"
        >
          Scan My Palm →
        </Link>
        <p className="text-xs text-gray-600 mt-4">
          Results are ECIES-encrypted and stored on Ritual Chain testnet.
        </p>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="text-center text-2xl font-bold mb-10">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              step: "1",
              title: "Upload Your Palm",
              desc: "Take a photo or upload an existing image of your open palm.",
            },
            {
              step: "2",
              title: "AI Analyzes On-Chain",
              desc: "Gemini vision extracts features, then GLM processes them inside a Ritual TEE — no API keys exposed on-chain.",
            },
            {
              step: "3",
              title: "Private Reading",
              desc: "Results are ECIES-encrypted to your wallet. Only you can decrypt and view your reading.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-xl bg-gray-900 border border-gray-800 p-5"
            >
              <div className="w-8 h-8 rounded-full bg-[#19D184] text-black font-bold text-sm flex items-center justify-center mb-3">
                {item.step}
              </div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Archetypes */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-center text-2xl font-bold mb-10">
          The 5 Palm Archetypes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ARCHETYPES.map((a) => (
            <div
              key={a.name}
              className="rounded-xl border bg-gray-900/50 p-4"
              style={{ borderColor: `${a.color}30` }}
            >
              <div
                className="text-sm font-bold mb-1"
                style={{ color: a.color }}
              >
                {a.name}
              </div>
              <p className="text-xs text-gray-500">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
