import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import IssueCard from '../components/IssueCard';
import MapView from '../components/MapView';
import { getIssues, getDashboardStats, getCityBulletin, getOracleInsights } from '../services/api';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getCityCoords } from '../utils/cityCoords';

/* ── Constants ── */
const CATEGORY_FILTERS = [
  { key: 'all',         label: 'All',           emoji: '🗺️' },
  { key: 'pothole',     label: 'Potholes',      emoji: '🕳️' },
  { key: 'water_leak',  label: 'Water',         emoji: '💧' },
  { key: 'streetlight', label: 'Streetlights',  emoji: '💡' },
  { key: 'waste',       label: 'Waste',         emoji: '🗑️' },
  { key: 'flooding',    label: 'Flooding',      emoji: '🌊' },
  { key: 'traffic',     label: 'Traffic',       emoji: '🚦' },
  { key: 'parks',       label: 'Parks',         emoji: '🌳' },
  { key: 'other',       label: 'Other',         emoji: '📋' },
];

const FEATURE_PILLS = [
  '🤖 Gemini Vision Analysis', '⚖️ SLA Legal Citations',
  '🗺️ Live Issue Mapping', '🔄 Auto-Escalation',
  '📍 Precise GPS Tracking', '📊 Department Scorecards',
  '🏆 Civic Points', '✅ AI Resolution Verification',
  '🔮 Predictive Hotspots', '📰 City Intelligence Bulletin',
  '🌡️ Severity Heatmap', '🤝 Community Upvotes',
];

const DEMO_STEPS = [
  {
    num: '1️⃣', title: 'REPORT AN ISSUE',
    body: "Click 'Report Issue' → Upload any photo → Watch AI analyze it in seconds.",
    see: 'Category detection, severity score, hazard tags',
    link: '/report', linkLabel: 'Go to Report Issue →',
  },
  {
    num: '2️⃣', title: 'SEE THE AI COMPLAINT',
    body: 'After submitting, open the issue → Read the auto-generated formal complaint.',
    see: 'SLA section cited, department assigned, legal deadline set',
    link: null,
  },
  {
    num: '3️⃣', title: 'AUTHORITY DASHBOARD',
    body: "Click 'Authority Portal' → Generate AI Action Queue.",
    see: 'Gemini ranking 10+ issues by urgency in real-time',
    link: '/authority', linkLabel: 'Go to Authority Portal →',
  },
  {
    num: '4️⃣', title: 'ASK THE AI',
    body: "Open any issue → scroll to bottom → ask 'When will this be fixed?'",
    see: 'Multi-turn Gemini conversation with full issue context',
    link: null,
  },
  {
    num: '5️⃣', title: 'RUN THE ESCALATOR',
    body: 'Authority Dashboard → Run Escalator Agent button.',
    see: 'Autonomous deduplication + SLA breach detection live',
    link: '/authority', linkLabel: 'Go to Authority Portal →',
  },
];

/* ── Helpers ── */
function timeAgo(ts) {
  if (!ts) return '';
  let d;
  if (ts && ts.toDate) d = ts.toDate();
  else if (ts && ts._seconds) d = new Date(ts._seconds * 1000);
  else d = new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function getActivityIcon(issue) {
  if (issue.status === 'resolved') return '✅';
  if (issue.status === 'escalated') return '⚠️';
  return '🔴';
}

function getActivityLabel(issue) {
  const cat = (issue.analysis && issue.analysis.category) || issue.category || 'issue';
  const rawAddr = issue.location && issue.location.address;
  const loc = rawAddr ? rawAddr.split(',')[0] : 'the city';
  if (issue.status === 'resolved') return `${cat} on ${loc} marked Resolved`;
  if (issue.status === 'escalated') return `${cat} escalated on ${loc}`;
  return `New ${cat} reported on ${loc}`;
}

/* ── Sub-components ── */
function StatCard({ label, value, emoji, color, trend }) {
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (typeof value !== 'number') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        setStarted(true);
        let cur = 0;
        const end = value;
        if (end === 0) { setDisplay(0); return; }
        const step = Math.max(1, Math.floor(end / (1500 / 16)));
        const timer = setInterval(() => {
          cur = Math.min(cur + step, end);
          setDisplay(cur);
          if (cur >= end) clearInterval(timer);
        }, 16);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, started]);

  return (
    <div ref={ref} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${color}`}>{emoji}</div>
      <div>
        <div className="text-2xl font-extrabold text-gray-800 tabular-nums">
          {typeof value === 'number' ? display.toLocaleString() : value}
          {trend && typeof value === 'number' && value > 0 && (
            <span className="ml-1 text-xs font-bold text-green-500 align-middle">↑</span>
          )}
        </div>
        <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function ActivityItem({ issue, isNew }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-500 ${isNew ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}>
      <span className="text-lg shrink-0 mt-0.5">{getActivityIcon(issue)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 leading-snug capitalize truncate">{getActivityLabel(issue)}</p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(issue.updated_at || issue.updatedAt || issue.created_at || issue.createdAt)}</p>
      </div>
      {issue.id && (
        <Link to={`/issues/${issue.id}`} className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
          →
        </Link>
      )}
    </div>
  );
}

function DemoModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-3xl p-6 text-white">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🎯</span>
            <h2 className="text-xl font-extrabold">CivicLens.ai — Judge's Demo Guide</h2>
          </div>
          <p className="text-blue-100 text-sm">Here's what to explore in 3 minutes</p>
        </div>
        <div className="p-6 space-y-4">
          {DEMO_STEPS.map((step, i) => (
            <div key={i} className="border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow bg-gray-50/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{step.num}</span>
                <h3 className="font-extrabold text-gray-900 uppercase tracking-wide text-sm">{step.title}</h3>
              </div>
              <p className="text-sm text-gray-700 ml-8 mb-2">{step.body}</p>
              <div className="ml-8 flex flex-wrap items-center gap-3">
                <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-1 rounded-lg border border-blue-100">
                  👀 {step.see}
                </span>
                {step.link && (
                  <Link to={step.link} onClick={onClose} className="text-xs font-bold text-blue-600 hover:underline">
                    {step.linkLabel}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:shadow-lg hover:scale-[1.01] transition-all duration-200"
          >
            Got it — Let me explore! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}

function formatCategory(cat) {
  if (!cat) return '';
  return cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/* ── Main Component ── */
export default function Home() {
  const { user, userProfile } = useAuth();
  const userCity = userProfile && userProfile.city;
  const userCityCoords = getCityCoords(userCity);

  const [issues, setIssues]             = useState([]);
  const [stats, setStats]               = useState(null);
  const [bulletin, setBulletin]         = useState(null);
  const [activeFilter, setFilter]       = useState('all');
  const [loading, setLoading]           = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [bulletinLoading, setBulletinLoading] = useState(true);
  const [viewMode, setViewMode]         = useState('list');
  const [oracleInsights, setOracleInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const [activityFeed, setActivityFeed]     = useState([]);
  const [newActivityIds, setNewActivityIds] = useState(new Set());
  const [leaderboard, setLeaderboard]       = useState([]);
  const [showDemoModal, setShowDemoModal]   = useState(false);
  const [cityFilter, setCityFilter]         = useState('my_city'); // 'my_city' | 'all'

  const howItWorksRef = useRef(null);

  /* Fetch stats */
  useEffect(() => {
    getDashboardStats()
      .then(d => setStats(d.stats))
      .catch(() => setStats({ total_issues: 0, resolved_this_week: 0, active_reports: 0, departments_engaged: 0 }))
      .finally(() => setStatsLoading(false));
  }, []);

  /* Fetch bulletin */
  useEffect(() => {
    getCityBulletin(false)
      .then(d => { if (d.success) setBulletin(d.data); })
      .catch(() => {})
      .finally(() => setBulletinLoading(false));
  }, []);

  /* Fetch issues on filter change */
  useEffect(() => {
    setLoading(true);
    const params = { limit: 12 };
    if (activeFilter !== 'all') params.category = activeFilter;
    getIssues(params)
      .then(d => setIssues(d.issues || []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, [activeFilter]);

  /* Fetch Oracle when switching to map */
  useEffect(() => {
    if (viewMode === 'map' && !oracleInsights && !insightsLoading) {
      setInsightsLoading(true);
      getOracleInsights()
        .then(d => { if (d.success) setOracleInsights(d.data); })
        .catch(() => {})
        .finally(() => setInsightsLoading(false));
    }
  }, [viewMode, oracleInsights, insightsLoading]);

  /* Live Activity Feed */
  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('updated_at', 'desc'), limit(8));
    const unsub = onSnapshot(q, (snap) => {
      setActivityFeed(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const added = new Set();
      snap.docChanges().forEach(c => { if (c.type !== 'removed') added.add(c.doc.id); });
      if (added.size > 0) {
        setNewActivityIds(added);
        setTimeout(() => setNewActivityIds(new Set()), 4000);
      }
    }, () => {});
    return () => unsub();
  }, []);

  /* Leaderboard */
  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${base}/api/dashboard/leaderboard`)
      .then(r => r.json())
      .then(d => { if (d.success) setLeaderboard(d.leaderboard.slice(0, 3)); })
      .catch(() => {});
  }, []);

  // 1. Category filter
  let displayed = activeFilter === 'all'
    ? issues
    : issues.filter(i => (i.analysis && i.analysis.category || i.category) === activeFilter);

  // 2. City filter (only when logged in and city is known)
  if (user && userCity && cityFilter === 'my_city') {
    const filtered = displayed.filter(i => {
      const iCity = (i.location && (i.location.city || i.location.locCity)) || '';
      return iCity.toLowerCase() === userCity.toLowerCase();
    });
    // Only apply if there are results — prevents empty screen due to data inconsistency
    if (filtered.length > 0) displayed = filtered;
  }

  const scrollToHowItWorks = () => howItWorksRef.current && howItWorksRef.current.scrollIntoView({ behavior: 'smooth' });

  /* ── Logged-out Landing Hero ── */
  const LandingHero = () => (
    <section className="hero-gradient-animated rounded-3xl overflow-hidden px-8 py-20 text-white shadow-2xl relative">
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4 blur-2xl pointer-events-none" />
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 backdrop-blur-sm fade-up">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live Public Transparency Portal
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-6 fade-up" style={{ animationDelay: '0.1s' }}>
          Connecting Citizens.<br />
          <span className="text-blue-300">Demanding Accountability.</span><br />
          <span className="text-emerald-300">Transforming Cities.</span>
        </h1>
        <p className="text-slate-300 text-lg leading-relaxed mb-10 max-w-2xl mx-auto fade-up" style={{ animationDelay: '0.2s' }}>
          CivicLens harnesses autonomous AI agents to detect, route, and escalate infrastructure failures in real-time. We empower citizens to demand transparency and drive community-led accountability.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-14 fade-up" style={{ animationDelay: '0.3s' }}>
          <Link to="/register" id="hero-register-cta"
            className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-base">
            🚀 Get Started — It's Free
          </Link>
          <button onClick={scrollToHowItWorks}
            className="inline-flex items-center gap-2 border border-white/40 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-all duration-200 text-base backdrop-blur-sm">
            ▶ See How It Works
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-10 fade-up" style={{ animationDelay: '0.4s' }}>
          {[
            { n: statsLoading ? '...' : ((stats && stats.total_issues) || 15) + '+', label: 'Issues Analyzed' },
            { n: '5',  label: 'Autonomous AI Agents' },
            { n: '5+', label: 'Departments Connected' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-extrabold text-white">{s.n}</div>
              <div className="text-sm text-slate-300 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  /* ── Logged-in Hero ── */
  const LoggedInHero = () => (
    <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-civic-primary via-blue-600 to-indigo-700 px-8 py-16 text-white shadow-2xl">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4 pointer-events-none" />
      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 px-3 py-1 rounded-full text-sm font-medium mb-4">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> AI-Powered Civic Reporting
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
          Report Civic Issues.<br /><span className="text-blue-200">Demand Accountability.</span>
        </h1>
        <p className="text-blue-100 text-lg leading-relaxed mb-8 max-w-lg">
          Upload a photo — our AI instantly drafts a formal complaint, routes it correctly, and tracks the legal SLA deadline.
        </p>
        <Link to="/report" id="hero-report-cta"
          className="inline-flex items-center gap-2 bg-white text-civic-primary font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
          📸 Report an Issue
        </Link>
      </div>
    </section>
  );

  /* ── Feature Marquee ── */
  const doubled = [...FEATURE_PILLS, ...FEATURE_PILLS];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">

      {/* Hero */}
      {user ? <LoggedInHero /> : <LandingHero />}

      {/* Feature Marquee Strip */}
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm py-3">
        <div className="marquee-track">
          {doubled.map((pill, i) => (
            <span key={i}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 mx-2 bg-slate-50 border border-gray-200 rounded-full text-sm font-semibold text-gray-700 shrink-0 whitespace-nowrap hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors cursor-default">
              {pill}
            </span>
          ))}
        </div>
      </section>

      {/* Stats Bar */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Issues Reported"      value={statsLoading ? '—' : ((stats && stats.total_issues)       ?? 0)} emoji="🕳️" color="bg-blue-50"   trend />
          <StatCard label="Resolved This Month"  value={statsLoading ? '—' : ((stats && stats.resolved_this_week) ?? 0)} emoji="✅" color="bg-green-50"  trend />
          <StatCard label="Active Reports"       value={statsLoading ? '—' : ((stats && stats.active_reports)     ?? 0)} emoji="⚡" color="bg-yellow-50" />
          <StatCard label="Departments Engaged"  value={statsLoading ? '—' : ((stats && stats.departments_engaged)?? 0)} emoji="🏙️" color="bg-purple-50" />
        </div>
      </section>

      {/* City Bulletin */}
      {(bulletin || bulletinLoading) && (
        <section>
          <div className={`rounded-3xl border p-6 flex flex-col sm:flex-row items-start gap-5 ${
            !bulletin ? 'bg-gray-50 border-gray-100' :
            bulletin.health_trend === 'improving' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' :
            bulletin.health_trend === 'declining' ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200' :
            'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
          }`}>
            <div className="shrink-0">
              {bulletinLoading ? (
                <div className="w-16 h-16 rounded-2xl bg-gray-200 animate-pulse" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex flex-col items-center justify-center border border-gray-100">
                  <div className={`text-2xl font-extrabold ${bulletin.city_health_score >= 70 ? 'text-green-600' : bulletin.city_health_score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                    {bulletin.city_health_score}
                  </div>
                  <div className="text-xs text-gray-400 font-semibold leading-none">Health</div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">📰 City Bulletin</span>
                {!bulletinLoading && bulletin && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    bulletin.health_trend === 'improving' ? 'bg-green-100 text-green-700' :
                    bulletin.health_trend === 'declining' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {bulletin.health_trend === 'improving' ? '↑ Improving' : bulletin.health_trend === 'declining' ? '↓ Declining' : '→ Stable'} · {bulletin.health_label}
                  </span>
                )}
                {!bulletinLoading && bulletin && bulletin.primary_cities_analyzed && bulletin.primary_cities_analyzed.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/50 text-gray-600 border border-gray-200">
                    📍 {bulletin.primary_cities_analyzed.join(', ')}
                  </span>
                )}
              </div>
              {bulletinLoading ? (
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-4/5" />
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 leading-relaxed">{bulletin && bulletin.weekly_bulletin}</p>
                  {bulletin && bulletin.critical_alerts && bulletin.critical_alerts.length > 0 && (
                    <div className="bg-red-50/50 border border-red-100 rounded-lg p-3">
                      <h4 className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Critical Alerts
                      </h4>
                      <ul className="space-y-1">
                        {bulletin.critical_alerts.map((alert, i) => (
                          <li key={i} className="text-xs text-red-800 font-medium leading-snug">{alert}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Escalated Issues Strip */}
      {displayed.filter(i => i.status === 'escalated').length > 0 && (
        <section>
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
              </span>
              <h2 className="text-xl font-extrabold text-red-900">🚨 SLA Escalations</h2>
              <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                Public Accountability
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayed.filter(i => i.status === 'escalated').slice(0, 3).map(issue => (
                <div key={issue.id} className="bg-white rounded-xl border border-red-100 p-4 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      Deadline Breached
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      {timeAgo(issue.created_at || issue.createdAt)}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">
                    {issue.analysis?.category ? formatCategory(issue.analysis.category) : issue.category || 'Issue'} at {issue.location?.address?.split(',')[0] || 'Unknown Location'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {issue.user_description || issue.analysis?.ai_description || 'No description provided.'}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="text-xs font-semibold text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                      🏢 {issue.analysis?.suggested_department || issue.department || 'Authority'}
                    </div>
                    <Link to={`/issues/${issue.id}`} className="text-xs font-bold text-red-600 hover:underline">
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Issues + Activity Feed (2-column layout) */}
      <section>
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Main column */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-extrabold text-gray-800">
                  {user && userCity && cityFilter === 'my_city' ? `📍 ${userCity} Reports` : 'Recent Reports'}
                </h2>
                {user && userCity && (
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => setCityFilter('my_city')}
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full transition-all duration-200 ${cityFilter === 'my_city' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      📍 My City
                    </button>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={() => setCityFilter('all')}
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full transition-all duration-200 ${cityFilter === 'all' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      🌍 All Cities
                    </button>
                  </div>
                )}
              </div>
              {user && (
                <Link to="/report" className="text-sm font-semibold text-civic-primary hover:underline">+ File Report</Link>
              )}
            </div>

            {/* View toggles */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <div className="flex rounded-xl border border-gray-200 overflow-hidden shadow-sm flex-shrink-0">
                {[
                  { id: 'list',    label: '📋 List' },
                  { id: 'map',     label: '📍 Map' },
                ].map((m, i) => (
                  <button key={m.id} id={`view-toggle-${m.id}`} onClick={() => setViewMode(m.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all duration-200 ${i > 0 ? 'border-l border-gray-200' : ''} ${viewMode === m.id ? 'bg-civic-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              {viewMode === 'list' && (
                <div className="flex gap-2 flex-wrap">
                  {CATEGORY_FILTERS.map(f => (
                    <button key={f.key} id={`filter-${f.key}`} onClick={() => setFilter(f.key)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
                        activeFilter === f.key
                          ? 'bg-civic-primary text-white border-civic-primary shadow-md shadow-blue-100'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-civic-primary/40 hover:text-civic-primary'
                      }`}>
                      <span>{f.emoji}</span><span>{f.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Severity legend */}
            {viewMode === 'map' && (
              <div className="flex flex-wrap items-center gap-4 mb-4 px-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Severity:</span>
                {[['#d93025','Critical (5)'],['#f57c00','High (4)'],['#f9ab00','Moderate (3)'],['#188038','Low (1–2)']].map(([c,l]) => (
                  <span key={l} className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: c }} /> {l}
                  </span>
                ))}
              </div>
            )}

            {/* Map */}
            {viewMode === 'map' && (
              <div className="relative">
                {insightsLoading && (
                  <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow border border-gray-100 flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-civic-primary border-t-transparent rounded-full" />
                    <span className="text-xs font-bold text-gray-700">Oracle generating insights...</span>
                  </div>
                )}
                <MapView oracleInsights={oracleInsights} viewMode={viewMode} defaultCenter={userCityCoords} />
              </div>
            )}

            {/* List */}
            {viewMode === 'list' && (
              loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
                      <div className="h-48 bg-gray-200" />
                      <div className="p-4 space-y-3">
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <span className="text-6xl mb-4">🏙️</span>
                  <h3 className="text-lg font-bold text-gray-700 mb-2">No issues reported yet</h3>
                  <p className="text-gray-400 text-sm max-w-xs">Be the first to report a civic issue in your area and earn Civic Points!</p>
                  {user && (
                    <Link to="/report" className="mt-5 px-6 py-2.5 bg-civic-primary text-white font-bold rounded-xl hover:bg-blue-600 transition-colors">
                      Report First Issue
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {displayed.map(issue => <IssueCard key={issue.id} issue={issue} />)}
                </div>
              )
            )}
          </div>

          {/* Sidebar: Live Activity Feed */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-20">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                  Live Activity
                </h3>
                <span className="text-xs text-gray-400 font-medium">Real-time</span>
              </div>
              <div className="p-3 space-y-1 max-h-96 overflow-y-auto custom-scrollbar">
                {activityFeed.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">No recent activity yet.</p>
                    <p className="text-xs mt-1">Submit an issue to see it live!</p>
                  </div>
                ) : (
                  activityFeed.map(issue => (
                    <ActivityItem key={issue.id} issue={issue} isNew={newActivityIds.has(issue.id)} />
                  ))
                )}
              </div>
              {!user && (
                <div className="p-4 border-t border-gray-100 bg-blue-50/50">
                  <Link to="/register" className="block text-center text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    Join and start reporting →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How CivicLens Works */}
      <section ref={howItWorksRef} id="how-it-works" className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 scroll-mt-20">
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mb-3">
            The AI Pipeline
          </span>
          <h2 className="text-2xl font-extrabold text-gray-900">How CivicLens Works</h2>
          <p className="text-gray-500 mt-2 max-w-md mx-auto text-sm">
            Three autonomous AI agents handle everything — from photo to resolution.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
          {[
            { step: '1', emoji: '📸', color: 'bg-blue-100 text-blue-600', title: 'You Report',
              desc: "Snap a photo and upload. No complex forms, no categories to guess. Exact location is instantly mapped." },
            { step: '2', emoji: '🤖', color: 'bg-purple-100 text-purple-600', title: 'AI Analyzes',
              desc: 'Gemini instantly identifies the hazard, assesses severity, and generates a legal complaint citing SLA rules.' },
            { step: '3', emoji: '⚡', color: 'bg-amber-100 text-amber-600', title: 'Agents Act',
              desc: 'The Router assigns the department. The Escalator monitors deadlines. Resolution is AI-verified.' },
          ].map((item, idx) => (
            <div key={item.step} className="relative flex flex-col items-center text-center p-6 rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200 hover:-translate-y-1 bg-gray-50/50">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm ${item.color}`}>{item.emoji}</div>
              <div className="w-8 h-8 bg-civic-primary text-white rounded-full flex items-center justify-center text-sm font-extrabold mb-3 shadow">{item.step}</div>
              <h3 className="font-extrabold text-gray-900 text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              {idx < 2 && <div className="hidden sm:block absolute top-1/2 -right-2 z-10 text-gray-300 text-2xl font-bold -translate-y-1/2">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Community Leaderboard */}
      {leaderboard.length > 0 && (
        <section className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-3xl border border-amber-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">🏆 Trusted by the Community</h2>
              <p className="text-sm text-gray-500 mt-0.5">Top citizens making their city better</p>
            </div>
            {user && (
              <Link to="/dashboard" className="text-sm font-bold text-amber-700 hover:underline">View full leaderboard →</Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {leaderboard.map((person, i) => (
              <div key={person.id} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200">
                <div className="w-12 h-12 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-2xl shadow-sm shrink-0">
                  {['🥇','🥈','🥉'][i]}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 truncate">{person.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    <span className="font-bold text-amber-600">{(person.points || 0).toLocaleString()}</span> civic points
                    {person.reports > 0 && <span className="ml-2 text-gray-400">· {person.reports} reports</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!user && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-3">Join the community and earn points for every report!</p>
              <Link to="/register" className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-amber-600 transition-colors shadow-sm">
                🌱 Join CivicLens
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
