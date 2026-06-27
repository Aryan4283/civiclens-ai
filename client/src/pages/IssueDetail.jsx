import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIssue, upvoteIssue, askIssueAI, updateIssue, resolveIssue, verifyIssue } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SeverityBadge from '../components/SeverityBadge';
import UploadZone from '../components/UploadZone';
import axios from 'axios';

const STATUS_STEPS = ['reported', 'in_progress', 'resolved'];
const STATUS_LABEL = {
  reported:    'Reported',
  in_progress: 'In Progress',
  escalated:   'Escalated',
  resolved:    'Resolved',
  duplicate:   'Duplicate',
};

const CATEGORY_EMOJI = {
  pothole: '🕳️', water_leak: '💧', streetlight: '💡',
  waste: '🗑️', flooding: '🌊', road_damage: '🚧', other: '📋',
};

function timeAgo(dateInput) {
  if (!dateInput) return '';
  let date;
  if (dateInput?.toDate) date = dateInput.toDate();
  else if (dateInput?._seconds) date = new Date(dateInput._seconds * 1000);
  else date = new Date(dateInput);
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} minutes ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [issue, setIssue]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [upvotes, setUpvotes]   = useState(0);
  const [upvoting, setUpvoting] = useState(false);
  const [copied, setCopied]     = useState(false);
  
  // Authority controls state
  const [updating, setUpdating] = useState(false);
  const [editDept, setEditDept] = useState('');

  // AI Chat state
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput]     = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  const [showVerify, setShowVerify] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');
  
  const miniMapRef = useRef(null);

  useEffect(() => {
    if (!issue || !issue.location?.lat || !miniMapRef.current) return;
    
    const initMiniMap = () => {
      if (!miniMapRef.current) return;
      const pos = { lat: Number(issue.location.lat), lng: Number(issue.location.lng) };
      const map = new window.google.maps.Map(miniMapRef.current, {
        center: pos,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      new window.google.maps.Marker({
        position: pos,
        map,
      });
    };

    if (window.google && window.google.maps) {
      initMiniMap();
    } else {
      if (document.getElementById('google-maps-script')) {
        const check = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(check);
            initMiniMap();
          }
        }, 100);
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}`;
      script.async = true;
      script.onload = initMiniMap;
      document.head.appendChild(script);
    }
  }, [issue]);

  // SLA Countdown
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!issue) return;
    const createdAt = issue.createdAt?.toDate
      ? issue.createdAt.toDate()
      : issue.createdAt?._seconds
      ? new Date(issue.createdAt._seconds * 1000)
      : issue.created_at ? new Date(issue.created_at) : null;
    const slaHours = issue.routing?.sla_deadline_hours || issue.sla_deadline_hours || 72;
    if (!createdAt) return;
    const deadline = new Date(createdAt.getTime() + slaHours * 3600000);

    const update = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        setCountdown({ expired: true, text: 'SLA EXPIRED', color: 'text-red-600', bg: 'bg-red-50 border-red-200' });
      } else {
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        const pct = remaining / (slaHours * 3600000);
        const color = pct > 0.5 ? 'text-green-600' : pct > 0.2 ? 'text-amber-600' : 'text-red-600';
        const bg = pct > 0.5 ? 'bg-green-50 border-green-200' : pct > 0.2 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
        setCountdown({ expired: false, text: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`, color, bg });
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [issue]);

  useEffect(() => {
    setLoading(true);
    getIssue(id)
      .then(data => {
        setIssue(data.issue);
        setUpvotes(data.issue?.upvotes || 0);
        setEditDept(data.issue?.routing?.assigned_agency || data.issue?.department || '');
      })
      .catch(() => setError('Issue not found or failed to load.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpvote = async () => {
    if (upvoting) return;
    setUpvoting(true);
    try { await upvoteIssue(id); setUpvotes(p => p + 1); }
    catch (_) {}
    finally { setUpvoting(false); }
  };

  const handleCopy = () => {
    const text = issue?.routing?.formal_complaint || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAuthorityUpdate = async (field, value) => {
    try {
      setUpdating(true);
      const updateData = field === 'status' ? { status: value } : { department: value };
      const res = await updateIssue(id, updateData);
      if (res.success) {
        setIssue(res.issue);
        if (field === 'department') {
          setEditDept(res.issue.routing?.assigned_agency || res.issue.department || '');
        }
      }
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to update issue');
    } finally {
      setUpdating(false);
    }
  };

  const sendChatMessage = async (question) => {
    if (!question.trim() || chatLoading) return;
    const userMsg = { role: 'user', text: question.trim() };
    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);
    setChatInput('');
    setChatLoading(true);
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    try {
      const data = await askIssueAI(
        id,
        question.trim(),
        chatHistory // send previous history (without the new user msg yet)
      );
      const aiMsg = { role: 'model', text: data.answer };
      setChatHistory([...nextHistory, aiMsg]);
    } catch {
      setChatHistory([...nextHistory, { role: 'model', text: '⚠️ Sorry, something went wrong. Please try again.' }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };
  const handleVerifyUpload = async (base64, type) => {
    if (!base64) {
      setShowVerify(false);
      return;
    }
    setVerifying(true);
    setVerifyMessage('AI is verifying your image...');
    try {
      const res = await verifyIssue(id, base64, type);
      if (res.success) {
        setVerifyMessage(`✅ ${res.message} (+${res.points_earned} pts)`);
        setIssue(prev => ({ ...prev, verified_by_community: true, verification_count: (prev.verification_count || 0) + 1 }));
        setTimeout(() => setShowVerify(false), 3000);
      } else {
        setVerifyMessage(`❌ ${res.message}`);
      }
    } catch (err) {
      console.error(err);
      setVerifyMessage('Failed to verify issue. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResolveUpload = async (base64, type) => {
    if (!base64) {
      setShowResolve(false);
      return;
    }
    setVerifying(true);
    setVerifyMessage('AI is verifying your resolution proof...');
    try {
      const res = await resolveIssue(id, base64, type);
      if (res.success) {
        setVerifyMessage(`✅ ${res.message} (+${res.points_earned || 10} pts)`);
        setIssue(prev => ({ 
          ...prev, 
          status: 'resolved', 
          resolution_media_url: base64,
          resolution_proof_explanation: res.verification?.explanation
        }));
        setTimeout(() => setShowResolve(false), 3000);
      } else {
        setVerifyMessage(`❌ ${res.message} ${res.verification?.explanation || ''}`);
      }
    } catch (err) {
      console.error(err);
      setVerifyMessage('Failed to verify resolution. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-civic-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 font-medium">Loading issue details…</p>
    </div>
  );

  if (error || !issue) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <span className="text-5xl">🔍</span>
      <h2 className="text-xl font-bold text-gray-700">Issue not found</h2>
      <p className="text-gray-400 text-sm">{error || 'This issue may have been removed or does not exist.'}</p>
      <button onClick={() => navigate('/')} className="mt-2 px-5 py-2.5 bg-civic-primary text-white font-bold rounded-xl hover:bg-blue-600">
        Back to Home
      </button>
    </div>
  );

  const analysis  = issue.analysis || {};
  const routing   = issue.routing || {};
  const category  = analysis.category || issue.category || 'other';
  const severity  = analysis.severity_score || 3;
  const hazardTags = analysis.hazard_tags || [];
  const status    = issue.status || 'reported';
  const statusIdx = STATUS_STEPS.indexOf(status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-civic-primary transition-colors font-medium">
          ← Back
        </button>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!\n\nShare this with your network to build community pressure and get authorities to act faster.');
          }}
          className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 rounded-full text-sm font-bold transition-all duration-200 border border-blue-200 shadow-sm hover:shadow"
        >
          <span>🔗</span> Share to escalate
        </button>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Media */}
        <div className={`relative bg-gray-900 min-h-[260px] max-h-[460px] flex ${issue.resolution_media_url ? 'flex-row' : 'items-center justify-center'} overflow-hidden`}>
          {issue.resolution_media_url ? (
            <>
              {/* Before Image */}
              <div className="w-1/2 relative border-r border-gray-700">
                <div className="absolute top-4 left-4 z-10 px-2 py-1 bg-black/60 text-white text-[10px] uppercase font-bold rounded">Before</div>
                <img src={issue.media_url || issue.mediaUrl} alt="Before" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
              </div>
              {/* After Image */}
              <div className="w-1/2 relative">
                <div className="absolute top-4 right-4 z-10 px-2 py-1 bg-green-500 text-white text-[10px] uppercase font-bold rounded shadow-lg shadow-green-500/50">After (Resolved)</div>
                <img src={issue.resolution_media_url} alt="After" className="w-full h-full object-cover" />
              </div>
            </>
          ) : (
            (issue.media_url || issue.mediaUrl) ? (
              (issue.media_type || issue.mediaType) === 'video' ? (
                <video src={issue.media_url || issue.mediaUrl} controls className="w-full max-h-[460px] object-contain" />
              ) : (
                <img src={issue.media_url || issue.mediaUrl} alt="Issue media" className="w-full max-h-[460px] object-contain" />
              )
            ) : (
              <div className="text-8xl py-12">{CATEGORY_EMOJI[category] || '📋'}</div>
            )
          )}
          {/* Status ribbon */}
          {!issue.resolution_media_url && (
            <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold shadow z-10 ${
              status === 'resolved'    ? 'bg-green-500 text-white' :
              status === 'escalated'  ? 'bg-civic-danger text-white' :
              status === 'in_progress' ? 'bg-civic-warning text-white' :
              'bg-civic-primary text-white'
            }`}>
              {STATUS_LABEL[status] || status}
            </div>
          )}
        </div>

        {/* Meta strip */}
        <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{CATEGORY_EMOJI[category] || '📋'}</span>
            <div>
              <h1 className="text-lg font-extrabold text-gray-800 capitalize">
                {category.replace(/_/g, ' ')}
              </h1>
              <p className="text-xs text-gray-400">{timeAgo(issue.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status !== 'resolved' && (
              <>
                <button
                  onClick={() => { setShowVerify(true); setShowResolve(false); }}
                  className="flex items-center gap-2 px-4 py-2 border border-green-200 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-all duration-200 text-sm font-bold shadow-sm"
                >
                  <span>🛡️</span>
                  <span>{issue.verified_by_community ? `Verified (${issue.verification_count || 1})` : 'Verify to Earn Points'}</span>
                </button>
                <button
                  onClick={() => { setShowResolve(true); setShowVerify(false); }}
                  className="flex items-center gap-2 px-4 py-2 border border-civic-primary rounded-xl bg-blue-50 text-civic-primary hover:bg-blue-100 transition-all duration-200 text-sm font-bold shadow-sm"
                >
                  <span>✅</span>
                  <span>Mark as Resolved</span>
                </button>
              </>
            )}
            <SeverityBadge score={severity} size="lg" />
            <button
              onClick={handleUpvote}
              disabled={upvoting}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl
                hover:border-civic-primary hover:bg-blue-50 transition-all duration-200 text-sm font-semibold"
            >
              <span className={upvoting ? 'animate-bounce' : ''}>👍</span>
              <span>{upvotes}</span>
            </button>
          </div>
        </div>

        {showVerify && (
          <div className="px-6 py-6 border-b border-gray-100 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Community Verification</h3>
            <p className="text-sm text-gray-600 mb-4">Upload a current photo of this issue. Our AI will verify if it matches to award you Civic Points!</p>
            {verifying || verifyMessage ? (
              <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
                {verifying && <div className="animate-spin rounded-full h-8 w-8 border-4 border-civic-primary border-t-transparent mx-auto mb-3"></div>}
                <p className="font-semibold text-gray-800">{verifyMessage}</p>
                {!verifying && verifyMessage && (
                  <button onClick={() => { setShowVerify(false); setVerifyMessage(''); }} className="mt-4 text-sm text-civic-primary font-bold">Close</button>
                )}
              </div>
            ) : (
              <UploadZone onUploadComplete={handleVerifyUpload} />
            )}
          </div>
        )}

        {showResolve && (
          <div className="px-6 py-6 border-b border-gray-100 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Upload Fix Proof</h3>
            <p className="text-sm text-gray-600 mb-4">Upload a current photo showing that this issue has been physically fixed. Our AI will verify the image before permanently closing this ticket.</p>
            {verifying || verifyMessage ? (
              <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
                {verifying && <div className="animate-spin rounded-full h-8 w-8 border-4 border-civic-primary border-t-transparent mx-auto mb-3"></div>}
                <p className="font-semibold text-gray-800">{verifyMessage}</p>
                {!verifying && verifyMessage && (
                  <button onClick={() => { setShowResolve(false); setVerifyMessage(''); }} className="mt-4 text-sm text-civic-primary font-bold">Close</button>
                )}
              </div>
            ) : (
              <UploadZone onUploadComplete={handleResolveUpload} />
            )}
          </div>
        )}

        {/* Location */}
        {issue.location && (
          <div className="px-6 py-4 border-b border-gray-100 flex items-start gap-2 text-sm text-gray-600">
            <span className="mt-0.5">📍</span>
            <span className="font-medium">
              {issue.location.address ? issue.location.address :
               (issue.location.city || issue.location.locCity) && (issue.location.state || issue.location.locState) ? 
                 `${issue.location.city || issue.location.locCity}, ${issue.location.state || issue.location.locState} (GPS Verified ✓)` :
               (issue.location.lat != null && issue.location.lng != null) ? 
                 `${Math.abs(issue.location.lat).toFixed(4)}° ${issue.location.lat >= 0 ? 'N' : 'S'}, ${Math.abs(issue.location.lng).toFixed(4)}° ${issue.location.lng >= 0 ? 'E' : 'W'}` :
                 'Location pinned on map'}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Analysis + Complaint */}
        <div className="lg:col-span-2 space-y-5">

          {/* AI Analysis */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                🤖 AI Analysis
              </h2>
              {analysis.confidence != null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-semibold">AI Confidence</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          analysis.confidence >= 0.8 ? 'bg-green-500' :
                          analysis.confidence >= 0.5 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${Math.round(analysis.confidence * 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${
                      analysis.confidence >= 0.8 ? 'text-green-600' :
                      analysis.confidence >= 0.5 ? 'text-amber-600' : 'text-red-500'
                    }`}>
                      {Math.round(analysis.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{analysis.ai_description || 'No description.'}</p>
            </div>

            {(issue.translated_description || issue.user_description) && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mt-2 space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <span>👤</span> Additional Citizen Details
                </p>
                <p className="text-sm text-gray-700 leading-relaxed italic">
                  "{issue.translated_description || issue.user_description}"
                </p>
                {issue.translated_description && issue.translated_description !== issue.user_description && (
                  <p className="text-xs text-gray-400">
                    <span className="font-semibold">Original:</span> {issue.user_description}
                  </p>
                )}
              </div>
            )}

            {analysis.recommended_interim_action && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2">
                <span className="text-blue-600 shrink-0">💡</span>
                <div>
                  <p className="text-xs text-blue-500 uppercase tracking-wider font-bold mb-0.5">Recommended Interim Action</p>
                  <p className="text-sm text-blue-800 font-medium">{analysis.recommended_interim_action}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Category</p>
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-sm font-semibold capitalize">
                  {CATEGORY_EMOJI[category]} {category.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Severity</p>
                <SeverityBadge score={severity} size="lg" />
              </div>
              {analysis.affected_population_estimate && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Impact Scale</p>
                  <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-100 px-3 py-1 rounded-full text-sm font-semibold capitalize">
                    👥 {analysis.affected_population_estimate}
                  </span>
                </div>
              )}
            </div>

            {hazardTags.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Hazard Tags</p>
                <div className="flex flex-wrap gap-2">
                  {hazardTags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-semibold">
                      ⚠️ {tag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Formal Complaint */}
          {routing.formal_complaint && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                  📄 Formal Complaint
                </h2>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500
                    hover:text-civic-primary transition-colors border border-gray-200 hover:border-civic-primary/40 px-3 py-1.5 rounded-lg"
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {routing.formal_complaint}
                </p>
              </div>
            </div>
          )}

          {/* Cited SLA Rule */}
          {routing.cited_sla_rule && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-2">
              <h2 className="text-sm font-extrabold text-amber-800 flex items-center gap-2">
                ⚖️ Cited SLA Rule
              </h2>
              <p className="text-sm text-amber-700 leading-relaxed font-medium">
                {routing.cited_sla_rule}
              </p>
            </div>
          )}

          {/* Citizen Next Steps */}
          {routing.citizen_next_steps && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-2">
              <h2 className="text-sm font-extrabold text-indigo-800 flex items-center gap-2">
                🧭 Your Next Steps
              </h2>
              <p className="text-sm text-indigo-700 leading-relaxed">
                {routing.citizen_next_steps}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: Routing + Status Timeline */}
        <div className="space-y-5">
          {/* Authority Controls */}
          {userProfile?.role === 'authority' && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm p-5 space-y-4">
            <h2 className="text-base font-extrabold text-amber-900 flex items-center gap-2">
              <span>🛡️</span> Authority Controls
            </h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-800 mb-1">Status</label>
                <select 
                  className="w-full text-sm border border-amber-200 rounded-lg p-2 cursor-pointer bg-white text-gray-800 focus:outline-none focus:border-amber-400 font-medium"
                  value={status}
                  onChange={(e) => handleAuthorityUpdate('status', e.target.value)}
                  disabled={updating}
                >
                  {status !== 'escalated' && <option value="reported">Reported</option>}
                  {status !== 'escalated' && <option value="in_progress">In Progress</option>}
                  {status === 'escalated' && <option value="escalated" disabled>Escalated 🚨</option>}
                  <option value="resolved">Resolved</option>
                  {status !== 'escalated' && <option value="duplicate">Duplicate</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-800 mb-1">Assigned Department</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    placeholder="e.g. DPW, DOT"
                    className="flex-1 text-sm border border-amber-200 rounded-lg p-2 bg-white text-gray-800 focus:outline-none focus:border-amber-400"
                    disabled={updating}
                  />
                  <button 
                    onClick={() => handleAuthorityUpdate('department', editDept)}
                    disabled={updating || editDept === (routing.assigned_agency || issue.department || '')}
                    className="px-3 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {updating ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Routing details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-base font-extrabold text-gray-800">🏛️ Routing</h2>

            {/* SLA Countdown Timer */}
            {status !== 'resolved' && countdown && (
              <div className={`rounded-xl border p-3 ${countdown.bg}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  {countdown.expired ? '🚨 SLA Status' : '⏰ SLA Countdown'}
                </p>
                <div className={`font-mono text-2xl font-extrabold tracking-widest ${countdown.color}`}>
                  {countdown.text}
                </div>
                {!countdown.expired && routing.sla_deadline_hours && (
                  <p className="text-xs text-gray-400 mt-1">remaining of {routing.sla_deadline_hours}h SLA</p>
                )}
              </div>
            )}

            {/* SLA Overdue Badge */}
            {(issue.escalation_level > 0 || status === 'escalated') && (
              <div className="rounded-xl border p-3 flex items-center gap-3 bg-red-50 border-red-200">
                <span className="text-2xl">🚨</span>
                <div>
                  <p className="text-sm font-extrabold text-red-800">
                    SLA Deadline Overdue
                  </p>
                  <p className="text-xs text-red-600">
                    This issue has breached its mandatory resolution timeframe.
                  </p>
                </div>
              </div>
            )}

            {/* Core routing fields */}
            {[
              { label: 'Assigned Agency', value: routing.assigned_agency },
              { label: 'SLA Tier',        value: routing.sla_tier },
              { label: 'Est. Resolution', value: routing.estimated_resolution_date },
              { label: 'Escalation Authority', value: routing.escalation_authority },
            ].map(({ label, value }) => value && (
              <div key={label}>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-700">{value}</p>
              </div>
            ))}

            {/* Priority Justification */}
            {routing.priority_justification && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Why This Priority?</p>
                <p className="text-xs text-gray-600 leading-relaxed">{routing.priority_justification}</p>
              </div>
            )}
          </div>

          {/* Status Timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-extrabold text-gray-800 mb-4">📍 Status Timeline</h2>
            <div className="space-y-4">
              {STATUS_STEPS.map((s, idx) => {
                const done    = statusIdx >= idx;
                const current = statusIdx === idx;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      transition-all duration-300 ${
                      done
                        ? 'bg-civic-primary text-white shadow-md shadow-blue-100'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {done ? '✓' : idx + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${current ? 'text-civic-primary' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                        {STATUS_LABEL[s]}
                      </p>
                      {current && <p className="text-xs text-gray-400">Current stage</p>}
                    </div>
                  </div>
                );
              })}
              {status === 'escalated' && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-civic-danger text-white flex items-center justify-center text-xs font-bold">
                    !
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-civic-danger">Escalated</p>
                    <p className="text-xs text-gray-400">SLA deadline breached</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location map coordinates */}
          {issue.location?.lat && issue.location?.lng && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="relative bg-gray-100 h-40 w-full" style={{ minHeight: '160px' }}>
                <div ref={miniMapRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow text-[10px] font-mono text-gray-600 font-bold border border-gray-100 pointer-events-none z-10">
                  {`${Math.abs(issue.location.lat).toFixed(4)}° ${issue.location.lat >= 0 ? 'N' : 'S'}, ${Math.abs(issue.location.lng).toFixed(4)}° ${issue.location.lng >= 0 ? 'E' : 'W'}`}
                </div>
              </div>
              {issue.location.address && (
                <div className="px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">📍 {issue.location.address}</p>
                </div>
              )}
            </div>
          )}

          {/* Issue ID */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Issue ID</p>
            <p className="font-mono text-xs text-gray-600 select-all break-all">{issue.id}</p>
          </div>
        </div>
      </div>

      {/* ── Ask AI Chat Section ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h2 className="text-base font-extrabold text-gray-800">Ask AI about this issue</h2>
          <span className="ml-auto text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Powered by Gemini</span>
        </div>

        {/* Chat messages */}
        <div
          className="flex flex-col gap-3 p-5 overflow-y-auto"
          style={{ maxHeight: '300px', minHeight: chatHistory.length === 0 ? '0' : '120px' }}
        >
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-civic-primary text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-500 px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                AI is thinking…
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Suggestion chips — only before first message */}
        {chatHistory.length === 0 && !chatLoading && (
          <div className="px-5 pb-4 flex flex-wrap gap-2">
            {[
              'What does this mean for me?',
              'How long until this gets fixed?',
              'What if it doesn\'t get resolved in time?',
              'Who should I contact?',
            ].map(suggestion => (
              <button
                key={suggestion}
                onClick={() => sendChatMessage(suggestion)}
                className="text-xs font-semibold text-civic-primary bg-blue-50 border border-blue-100 px-3 py-1.5
                  rounded-full hover:bg-civic-primary hover:text-white hover:border-civic-primary transition-all duration-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-civic-primary transition-colors">
            <input
              id="chat-input"
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChatMessage(chatInput)}
              placeholder="Ask anything about this issue…"
              disabled={chatLoading}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none disabled:opacity-60"
            />
            <button
              id="chat-send-btn"
              onClick={() => sendChatMessage(chatInput)}
              disabled={chatLoading || !chatInput.trim()}
              className="p-1.5 bg-civic-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-40
                disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
