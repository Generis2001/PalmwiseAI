"use client";

import type { PalmReading } from "@/lib/ritual/decodeReading";

const ARCHETYPE_COLORS: Record<string, string> = {
  "The Builder": "#F59E0B",
  "The Visionary": "#8B5CF6",
  "The Explorer": "#3B82F6",
  "The Guardian": "#10B981",
  "The Creator": "#EC4899",
};

const LINE_QUALITY_COLORS = {
  strong: "text-[#19D184]",
  moderate: "text-yellow-400",
  faint: "text-gray-500",
};

interface Props {
  reading: PalmReading;
  txHash?: string | null;
}

export function ReadingDisplay({ reading, txHash }: Props) {
  const accentColor = ARCHETYPE_COLORS[reading.archetype] ?? "#19D184";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Archetype badge */}
      <div className="text-center">
        <div
          className="inline-block px-5 py-2 rounded-full text-black font-bold text-lg mb-2"
          style={{ backgroundColor: accentColor }}
        >
          {reading.archetype}
        </div>
        <p className="text-gray-300 text-sm max-w-md mx-auto">
          {reading.archetype_description}
        </p>
      </div>

      {/* Reading summary */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-2">
          Your Reading
        </h3>
        <p className="text-gray-200 leading-relaxed">{reading.reading_summary}</p>
      </div>

      {/* Traits grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3">
            Personality Traits
          </h3>
          <div className="flex flex-wrap gap-2">
            {reading.personality_traits.map((t) => (
              <span
                key={t}
                className="px-3 py-1 rounded-full text-xs border border-gray-700 text-gray-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3">
            Strengths
          </h3>
          <ul className="space-y-1">
            {reading.strengths.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-[#19D184]">+</span> {s}
              </li>
            ))}
          </ul>
          <h3 className="text-xs text-gray-500 uppercase tracking-widest mt-4 mb-3">
            Challenges
          </h3>
          <ul className="space-y-1">
            {reading.challenges.map((c) => (
              <li key={c} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-yellow-500">~</span> {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Palm lines */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">
          Palm Lines
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(
            [
              { label: "Life Line", data: reading.life_line },
              { label: "Heart Line", data: reading.heart_line },
              { label: "Head Line", data: reading.head_line },
            ] as const
          ).map(({ label, data }) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-white">{label}</span>
                <span
                  className={`text-xs capitalize ${LINE_QUALITY_COLORS[data.quality]}`}
                >
                  {data.quality}
                </span>
              </div>
              <p className="text-xs text-gray-500">{data.description}</p>
            </div>
          ))}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-white">Fate Line</span>
              <span
                className={`text-xs ${reading.fate_line.present ? "text-[#19D184]" : "text-gray-600"}`}
              >
                {reading.fate_line.present ? "Present" : "Absent"}
              </span>
            </div>
            <p className="text-xs text-gray-500">{reading.fate_line.description}</p>
          </div>
        </div>
      </div>

      {/* Style + daily reflection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-2">
            Communication Style
          </h3>
          <p className="text-sm text-gray-300">{reading.communication_style}</p>
        </div>
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-2">
            Leadership
          </h3>
          <p className="text-sm text-gray-300">{reading.leadership_tendency}</p>
        </div>
      </div>

      {/* Daily reflection */}
      <div
        className="rounded-xl border p-5 text-center"
        style={{ borderColor: `${accentColor}40`, backgroundColor: `${accentColor}08` }}
      >
        <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-2">
          Daily Reflection
        </h3>
        <p className="text-gray-200 italic text-sm">{reading.daily_reflection}</p>
      </div>

      {/* On-chain proof */}
      {txHash && (
        <div className="text-center">
          <a
            href={`https://explorer.ritualfoundation.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-600 hover:text-[#19D184] transition-colors underline underline-offset-2"
          >
            View on-chain proof ↗
          </a>
        </div>
      )}
    </div>
  );
}
