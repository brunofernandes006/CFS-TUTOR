import React from "react";

interface CircularGaugeProps {
  value: number; // 0-100
  label: string;
  size?: "small" | "medium" | "large";
  color?: "primary" | "warning" | "alert";
  className?: string;
}

const sizeConfig = {
  small: { radius: 30, cx: 40, cy: 40, size: 80 },
  medium: { radius: 45, cx: 60, cy: 60, size: 120 },
  large: { radius: 60, cx: 80, cy: 80, size: 160 },
};

const colorConfig = {
  primary: "url(#gradientPrimary)",
  warning: "url(#gradientWarning)",
  alert: "url(#gradientAlert)",
};

export function CircularGauge({
  value,
  label,
  size = "medium",
  color = "primary",
  className = "",
}: CircularGaugeProps) {
  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={config.size}
        height={config.size}
        viewBox={`0 0 ${config.size} ${config.size}`}
        className="drop-shadow-lg"
      >
        <defs>
          <linearGradient id="gradientPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00b4ff" />
            <stop offset="100%" stopColor="#00e5ff" />
          </linearGradient>
          <linearGradient id="gradientWarning" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffa502" />
            <stop offset="100%" stopColor="#ffb819" />
          </linearGradient>
          <linearGradient id="gradientAlert" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff4757" />
            <stop offset="100%" stopColor="#ff6b7a" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx={config.cx}
          cy={config.cy}
          r={config.radius}
          fill="none"
          stroke="#2a3a4a"
          strokeWidth="6"
        />

        {/* Progress circle */}
        <circle
          cx={config.cx}
          cy={config.cy}
          r={config.radius}
          fill="none"
          stroke={colorConfig[color]}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
          transform={`rotate(-90 ${config.cx} ${config.cy})`}
        />

        {/* Text - percentage */}
        <text
          x={config.cx}
          y={config.cy - 10}
          textAnchor="middle"
          fontSize={size === "small" ? "20" : size === "medium" ? "32" : "40"}
          fontWeight="700"
          fill="#e8ecf1"
        >
          {value}%
        </text>

        {/* Text - label */}
        <text
          x={config.cx}
          y={config.cy + 15}
          textAnchor="middle"
          fontSize={size === "small" ? "10" : size === "medium" ? "12" : "14"}
          fill="#8a9aaa"
          style={{ textTransform: "uppercase" }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
