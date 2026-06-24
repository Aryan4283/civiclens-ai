import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import IssueCard from '../components/IssueCard';
import MapView from '../components/MapView';
import { getIssues, getDashboardStats } from '../services/api';

const CATEGORY_FILTERS = [
  { key: 'all',        label: 'All',          emoji: '🗺️' },
  { key: 'pothole',    label: 'Potholes',     emoji: '🕳️' },
  { key: 'water_leak', label: 'Water',        emoji: '💧' },
  { key: 'streetlight',label: 'Streetlights', emoji: '💡' },
  { key: 'waste',      label: 'Waste',        emoji: '🗑️' },
  { key: 'flooding',   label: 'Flooding',     emoji: '🌊' },
];

function StatCard({ label, value, emoji, color }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4
      hover:shadow-md transition-shadow duration-200`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
        {emoji}
      </div>
      <div>
        <div className="text-2xl font-extrabold text-gray-800">{value}</div>
        <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [issues, setIssues]           = useState([]);
  const [stats, setStats]             = useState(null);
  const [activeFilter, setFilter]     = useState('all');
  const [loading, setLoading]         = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [viewMode, setViewMode]       = useState('list');

  // Fetch stats
  useEffect(() => {
    getDashboardStats()
      .then(data => setStats(data.stats))
      .catch(() => setStats({ total_issues: 0, resolved_this_week: 0, active_reports: 0, departments_engaged: 0 }))
      .finally(() => setStatsLoading(false));
  }, []);

  // Fetch issues when filter changes
  useEffect(() => {
    setLoading(true);
    const params = { limit: 12 };
    if (activeFilter !== 'all') params.category = activeFilter;

    getIssues(params)
      .then(data => setIssues(data.issues || []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, [activeFilter]);

  // Category filter needs server support — for now filter in-memory if needed
  const displayed = activeFilter === 'all'
    ? issues
    : issues.filter(i => (i.analysis?.category || i.category) === activeFilter);

  return (
    <div className="max-w-7xl mx-auto space-y-10">

      {/* ── Hero ── */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-civic-primary via-blue-600 to-indigo-700 px-8 py-16 text-white shadow-2xl">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 px-3 py-1 rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            AI-Powered Civic Reporting
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
            Report Civic Issues.<br />
            <span className="text-blue-200">AI Does the Rest.</span>
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed mb-8 max-w-lg">
            Upload a photo — our AI analyzes it, routes it to the right department,
            and generates a formal complaint citing SLA rules. All in seconds.
          </p>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <Link
                to="/report"
                id="hero-report-cta"
                className="inline-flex items-center gap-2 bg-white text-civic-primary font-bold
                  px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105
                  transition-all duration-200"
              >
                📸 Report an Issue
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  id="hero-register-cta"
                  className="inline-flex items-center gap-2 bg-white text-civic-primary font-bold
                    px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105
                    transition-all duration-200"
                >
                  Get Started Free
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 border border-white/40 text-white font-semibold
                    px-6 py-3 rounded-xl hover:bg-white/10 transition-all duration-200"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Issues Reported"
            value={statsLoading ? '—' : (stats?.total_issues ?? 0)}
            emoji="📊"
            color="bg-blue-50"
          />
          <StatCard
            label="Resolved This Week"
            value={statsLoading ? '—' : (stats?.resolved_this_week ?? 0)}
            emoji="✅"
            color="bg-green-50"
          />
          <StatCard
            label="Active Reports"
            value={statsLoading ? '—' : (stats?.active_reports ?? 0)}
            emoji="⚡"
            color="bg-yellow-50"
          />
          <StatCard
            label="Departments Engaged"
            value={statsLoading ? '—' : (stats?.departments_engaged ?? 0)}
            emoji="🏢"
            color="bg-purple-50"
          />
        </div>
      </section>

      {/* ── Category Filters + Issue Grid / Map ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-extrabold text-gray-800">Recent Reports</h2>
          {user && (
            <Link to="/report"
              className="text-sm font-semibold text-civic-primary hover:underline">
              + File Report
            </Link>
          )}
        </div>

        {/* View Toggle + Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          {/* List / Map toggle */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden shadow-sm flex-shrink-0">
            <button
              id="view-toggle-list"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-civic-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              📋 List View
            </button>
            <button
              id="view-toggle-map"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-l border-gray-200 transition-all duration-200 ${
                viewMode === 'map'
                  ? 'bg-civic-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              🗺️ Map View
            </button>
          </div>

          {/* Category filter tabs — only meaningful in list mode */}
          {viewMode === 'list' && (
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_FILTERS.map(f => (
                <button
                  key={f.key}
                  id={`filter-${f.key}`}
                  onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold
                    border transition-all duration-200 ${
                    activeFilter === f.key
                      ? 'bg-civic-primary text-white border-civic-primary shadow-md shadow-blue-100'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-civic-primary/40 hover:text-civic-primary'
                  }`}
                >
                  <span>{f.emoji}</span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Severity legend — only in map mode */}
        {viewMode === 'map' && (
          <div className="flex flex-wrap items-center gap-4 mb-4 px-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Severity:</span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <span className="w-3 h-3 rounded-full bg-[#d93025] inline-block" /> Critical (5)
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <span className="w-3 h-3 rounded-full bg-[#f57c00] inline-block" /> High (4)
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <span className="w-3 h-3 rounded-full bg-[#f9ab00] inline-block" /> Moderate (3)
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <span className="w-3 h-3 rounded-full bg-[#188038] inline-block" /> Low (1–2)
            </span>
          </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <MapView issues={issues} />
        )}

        {/* List View */}
        {viewMode === 'list' && (
          loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-civic-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Loading reports…</p>
              </div>
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-6xl mb-4">🏙️</span>
              <h3 className="text-lg font-bold text-gray-700 mb-2">No issues reported yet</h3>
              <p className="text-gray-400 text-sm max-w-xs">
                Be the first to report a civic issue in your area and earn Civic Points!
              </p>
              {user && (
                <Link to="/report" className="mt-5 px-6 py-2.5 bg-civic-primary text-white font-bold rounded-xl hover:bg-blue-600 transition-colors">
                  Report First Issue
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayed.map(issue => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          )
        )}
      </section>

      {/* ── How it works ── */}
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-xl font-extrabold text-gray-800 text-center mb-8">How CivicLens Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { step: '1', emoji: '📸', title: 'Upload Media', desc: 'Take a photo or video of the issue.' },
            { step: '2', emoji: '🤖', title: 'AI Analyzes', desc: 'Gemini AI classifies the issue and drafts a formal complaint.' },
            { step: '3', emoji: '🏛️', title: 'Routed to Authorities', desc: 'Complaint is sent to the responsible department per SLA rules.' },
          ].map(item => (
            <div key={item.step} className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                {item.emoji}
              </div>
              <div className="w-7 h-7 bg-civic-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                {item.step}
              </div>
              <h3 className="font-bold text-gray-800">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
