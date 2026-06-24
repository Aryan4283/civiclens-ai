import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserDashboard } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import axios from 'axios';

const STATUS_STYLE = {
  reported:    { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Reported' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In Progress' },
  escalated:   { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Escalated' },
  resolved:    { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Resolved' },
  duplicate:   { bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'Duplicate' },
};

const BADGE_TIERS = [
  { pts: 0,   emoji: '🌱', name: 'Newcomer',    color: 'bg-gray-100 text-gray-600' },
  { pts: 10,  emoji: '⭐', name: 'Contributor',  color: 'bg-amber-100 text-amber-700' },
  { pts: 50,  emoji: '🥈', name: 'Advocate',    color: 'bg-slate-200 text-slate-700' },
  { pts: 150, emoji: '🥇', name: 'Champion',    color: 'bg-yellow-100 text-yellow-700' },
  { pts: 500, emoji: '🛡️', name: 'City Guardian', color: 'bg-blue-100 text-blue-700' },
];

function getBadge(pts) {
  let badge = BADGE_TIERS[0];
  for (const tier of BADGE_TIERS) {
    if (pts >= tier.pts) badge = tier;
  }
  return badge;
}

function getNextBadge(pts) {
  for (const tier of BADGE_TIERS) {
    if (pts < tier.pts) return tier;
  }
  return null;
}

function timeAgo(dateInput) {
  if (!dateInput) return '—';
  let date;
  if (dateInput?.toDate) date = dateInput.toDate();
  else if (dateInput?._seconds) date = new Date(dateInput._seconds * 1000);
  else date = new Date(dateInput);
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function QuickStatCard({ emoji, label, value, color }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color}`}>{emoji}</div>
      <div>
        <div className="text-2xl font-extrabold text-gray-800">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function CitizenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserDashboard(user.uid)
      .then(res => setData(res))
      .catch(() => setData({ issues: [], userData: { civic_points: 0, badges: [] } }))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (activeTab === 'leaderboard' && leaderboard.length === 0) {
      setLeaderboardLoading(true);
      axios.get('/api/dashboard/leaderboard')
        .then(res => {
          if (res.data?.success) setLeaderboard(res.data.leaderboard);
        })
        .catch(err => console.error(err))
        .finally(() => setLeaderboardLoading(false));
    }
  }, [activeTab]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-civic-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 font-medium">Loading your dashboard…</p>
    </div>
  );

  const issues    = data?.issues || [];
  const userData  = data?.userData || {};
  const pts       = userData.civic_points || 0;
  const badge     = getBadge(pts);
  const nextBadge = getNextBadge(pts);
  const progress  = nextBadge ? Math.min(100, Math.round(((pts - badge.pts) / (nextBadge.pts - badge.pts)) * 100)) : 100;

  const totalReports  = issues.length;
  const resolved      = issues.filter(i => i.status === 'resolved').length;
  const inProgress    = issues.filter(i => i.status === 'in_progress').length;
  const escalated     = issues.filter(i => i.status === 'escalated').length;

  const displayName   = user?.displayName || user?.email?.split('@')[0] || 'Citizen';

  return (
    <div className="max-w-5xl mx-auto space-y-7">

      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-civic-primary via-blue-600 to-indigo-600 rounded-3xl px-8 py-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-blue-200 text-sm font-medium mb-1">Welcome back,</p>
          <h1 className="text-3xl font-extrabold">{displayName}! 👋</h1>
          <p className="text-blue-200 text-sm mt-1">
            You've made a real difference in your city.
          </p>
        </div>
        <Link
          to="/report"
          className="shrink-0 bg-white text-civic-primary font-bold px-5 py-2.5 rounded-xl
            hover:scale-105 transition-transform duration-200 shadow-md text-sm"
        >
          + File New Report
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'dashboard' ? 'border-civic-primary text-civic-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          My Dashboard
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'leaderboard' ? 'border-civic-primary text-civic-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          City Leaderboard 🏆
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="space-y-7">
          {/* Civic Points + Badge row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Points card */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-500">Civic Points</h2>
            <span className="text-xs text-gray-400">🛡️ Contributor Score</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-extrabold text-amber-500">{pts.toLocaleString()}</span>
            <span className="text-gray-400 text-sm pb-2">points</span>
          </div>
          {nextBadge ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 font-medium">
                <span>{badge.emoji} {badge.name}</span>
                <span>{nextBadge.pts - pts} pts to {nextBadge.emoji} {nextBadge.name}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-civic-primary font-semibold">🏆 Max rank achieved!</p>
          )}
        </div>

        {/* Badges earned */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-500">Badges Earned</h2>
          <div className="flex flex-wrap gap-2">
            {BADGE_TIERS.filter(t => pts >= t.pts).map(t => (
              <span key={t.name}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${t.color} border border-white shadow-sm`}>
                {t.emoji} {t.name}
              </span>
            ))}
            {BADGE_TIERS.filter(t => pts < t.pts).map(t => (
              <span key={t.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-50 text-gray-300 border border-gray-100">
                🔒 {t.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickStatCard emoji="📋" label="Total Reports"  value={totalReports} color="bg-blue-50" />
        <QuickStatCard emoji="✅" label="Resolved"       value={resolved}     color="bg-green-50" />
        <QuickStatCard emoji="🔄" label="In Progress"    value={inProgress}   color="bg-yellow-50" />
        <QuickStatCard emoji="🚨" label="Escalated"      value={escalated}    color="bg-red-50" />
      </div>

      {/* Reports table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-extrabold text-gray-800">📋 My Reports</h2>
          <span className="text-xs text-gray-400">{totalReports} total</span>
        </div>

        {issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <span className="text-5xl mb-3">🏙️</span>
            <h3 className="font-bold text-gray-700">No issues reported yet</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              File your first report and earn 10 Civic Points!
            </p>
            <Link to="/report" className="mt-4 px-5 py-2.5 bg-civic-primary text-white font-bold rounded-xl hover:bg-blue-600 text-sm">
              Report First Issue
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Issue</th>
                  <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wider">Filed</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {issues.map(issue => {
                  const cat = issue.analysis?.category || issue.category || 'other';
                  const sev = issue.analysis?.severity_score || 3;
                  const st  = STATUS_STYLE[issue.status] || STATUS_STYLE.reported;
                  return (
                    <tr key={issue.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 max-w-[220px]">
                        <p className="font-semibold text-gray-800 truncate">
                          {issue.analysis?.ai_description || issue.ai_description || 'Civic issue'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{issue.id}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="capitalize text-gray-600 text-xs font-semibold">
                          {cat.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <SeverityBadge score={sev} showLabel={false} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-400">
                        {timeAgo(issue.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/issues/${issue.id}`)}
                          className="text-xs text-civic-primary font-semibold hover:underline"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span>🏆</span> Community Leaderboard
          </h2>
          
          {leaderboardLoading ? (
            <div className="text-center py-10 text-gray-500">Loading top citizens...</div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((citizen, idx) => {
                const cBadge = getBadge(citizen.points);
                return (
                  <div key={citizen.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-white transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xl">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{citizen.name}</p>
                        <p className="text-xs text-gray-500">{cBadge.emoji} {cBadge.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-amber-500 text-lg">{citizen.points.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">pts</p>
                    </div>
                  </div>
                );
              })}
              {leaderboard.length === 0 && (
                <p className="text-center text-gray-500 italic">No points earned yet by the community.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
