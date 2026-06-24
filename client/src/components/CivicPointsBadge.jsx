import React from 'react';

export default function CivicPointsBadge({ points = 0 }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200
        text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm
        hover:bg-amber-100 transition-colors duration-200 select-none"
      title="Civic Points"
    >
      🛡️
      <span>{points.toLocaleString()} pts</span>
    </span>
  );
}
