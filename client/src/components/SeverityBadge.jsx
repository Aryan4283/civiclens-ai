import React from 'react';

const SEVERITY_CONFIG = {
  1: { label: 'Minor',    bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-300',   dot: 'bg-gray-400'   },
  2: { label: 'Low',      bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300',   dot: 'bg-blue-500'   },
  3: { label: 'Moderate', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', dot: 'bg-yellow-500' },
  4: { label: 'High',     bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' },
  5: { label: 'Critical', bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    dot: 'bg-red-500'    },
};

export default function SeverityBadge({ score, showLabel = true, size = 'sm' }) {
  const cfg = SEVERITY_CONFIG[score] || SEVERITY_CONFIG[3];
  const textSize = size === 'lg' ? 'text-sm' : 'text-xs';
  const padding  = size === 'lg' ? 'px-3 py-1.5' : 'px-2 py-0.5';
  const dotSize  = size === 'lg' ? 'w-2.5 h-2.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border
        ${cfg.bg} ${cfg.text} ${cfg.border} ${textSize} ${padding}`}
    >
      <span className={`rounded-full ${cfg.dot} ${dotSize} shrink-0`} />
      {showLabel && <span>{cfg.label}</span>}
      {showLabel && <span className="opacity-60">({score}/5)</span>}
    </span>
  );
}
