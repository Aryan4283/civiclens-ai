import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SeverityBadge from './SeverityBadge';
import { upvoteIssue } from '../services/api';

const CATEGORY_MAP = {
  pothole:     { emoji: '🕳️', label: 'Pothole' },
  water_leak:  { emoji: '💧', label: 'Water Leak' },
  streetlight: { emoji: '💡', label: 'Streetlight' },
  waste:       { emoji: '🗑️', label: 'Waste' },
  flooding:    { emoji: '🌊', label: 'Flooding' },
  road_damage: { emoji: '🚧', label: 'Road Damage' },
  other:       { emoji: '📋', label: 'Other' },
};

const STATUS_MAP = {
  reported:    { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Reported' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In Progress' },
  escalated:   { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Escalated' },
  resolved:    { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Resolved' },
  duplicate:   { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Duplicate' },
};

function timeAgo(dateInput) {
  if (!dateInput) return '';
  let date;
  if (dateInput?.toDate) date = dateInput.toDate();
  else if (typeof dateInput === 'string' || typeof dateInput === 'number') date = new Date(dateInput);
  else if (dateInput instanceof Date) date = dateInput;
  else if (dateInput?._seconds) date = new Date(dateInput._seconds * 1000);
  else return '';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function IssueCard({ issue }) {
  const navigate = useNavigate();
  const [upvotes, setUpvotes] = useState(issue.upvotes || 0);
  const [upvoting, setUpvoting] = useState(false);

  const category  = issue.analysis?.category || issue.category || 'other';
  const severity  = issue.analysis?.severity_score || issue.severity_score || 3;
  const desc      = issue.analysis?.ai_description || issue.ai_description || '';
  const status    = issue.status || 'reported';
  const dept      = issue.routing?.assigned_agency || issue.analysis?.suggested_department || '—';
  const catCfg    = CATEGORY_MAP[category] || CATEGORY_MAP.other;
  const statusCfg = STATUS_MAP[status] || STATUS_MAP.reported;

  const handleUpvote = async (e) => {
    e.stopPropagation();
    if (upvoting) return;
    setUpvoting(true);
    try {
      await upvoteIssue(issue.id);
      setUpvotes(p => p + 1);
    } catch (_) {}
    finally { setUpvoting(false); }
  };

  return (
    <div
      onClick={() => navigate(`/issues/${issue.id}`)}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg
        hover:border-civic-primary/30 cursor-pointer transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative h-60 bg-gray-100 overflow-hidden">
        {(issue.media_url || issue.mediaUrl) ? (
          (issue.media_type || issue.mediaType) === 'video' ? (
            <video
              src={issue.media_url || issue.mediaUrl}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              muted
            />
          ) : (
            <img
              src={issue.media_url || issue.mediaUrl}
              alt={desc}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-gray-50 to-gray-200">
            {catCfg.emoji}
          </div>
        )}
        {/* Status overlay badge */}
        <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full
          ${statusCfg.bg} ${statusCfg.text}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Category + severity row */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
            <span className="text-base">{catCfg.emoji}</span>
            {catCfg.label}
          </span>
          <SeverityBadge score={severity} />
        </div>

        {/* AI Description */}
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 flex-1">
          {desc || 'No description available.'}
        </p>

        {/* Department */}
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <span>🏢</span>
          <span className="truncate">{dept}</span>
        </div>

        {/* Footer: upvotes + date */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <button
            onClick={handleUpvote}
            disabled={upvoting}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500
              hover:text-civic-primary transition-colors duration-200 disabled:opacity-50"
            title="Upvote this issue"
          >
            <span className={`text-base transition-transform duration-200 ${upvoting ? 'scale-125' : 'hover:scale-110'}`}>
              👍
            </span>
            <span>{upvotes}</span>
          </button>
          <span className="text-xs text-gray-400">{timeAgo(issue.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
