"use client";

interface PalmWiseLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function PalmWiseLogo({ size = 36, showText = true, className = "" }: PalmWiseLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer scan ring — circular radar border */}
        <circle
          cx="24"
          cy="24"
          r="21"
          stroke="#19D184"
          strokeWidth="2"
          opacity="0.4"
          fill="none"
        />
        {/* Scan arc — top-right quadrant (radar sweep) */}
        <path
          d="M24 3 A21 21 0 0 1 44.21 31.5"
          stroke="#19D184"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Scan line — from center to arc */}
        <line
          x1="24"
          y1="24"
          x2="38"
          y2="8"
          stroke="#19D184"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* Scan dot at the end */}
        <circle cx="38" cy="8" r="2.5" fill="#19D184" />

        {/* P letter */}
        <text
          x="24"
          y="31"
          textAnchor="middle"
          fontWeight="700"
          fontSize="22"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          <tspan fill="#19D184">P</tspan>
        </text>
      </svg>
      {showText && (
        <span className="text-lg font-bold tracking-tight">
          <span className="text-[#19D184]">Palm</span>
          <span className="text-white">Wise</span>
        </span>
      )}
    </div>
  );
}
