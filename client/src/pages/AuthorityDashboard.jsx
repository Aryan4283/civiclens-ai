import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActionQueue, getIssues, updateIssue, getCityBulletin, resolveIssue, getDepartmentScorecard } from '../services/api';
import axios from 'axios';

export default function AuthorityDashboard() {
  const [loading, setLoading] = useState(false);
  const [queueData, setQueueData] = useState(null);
  const [error, setError] = useState(null);
  const [issues, setIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(true);

  const [oracleData, setOracleData] = useState(null);
  const [oracleLoading, setOracleLoading] = useState(false);
  const [oracleError, setOracleError] = useState(null);

  const [bulletinData, setBulletinData] = useState(null);
  const [bulletinLoading, setBulletinLoading] = useState(true);

  const [escalatorRunning, setEscalatorRunning] = useState(false);
  const [escalatorToast, setEscalatorToast] = useState(null);

  // Secret Demo Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + Shift + E
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        // Prevent double triggers
        if (!escalatorRunning) {
          triggerEscalator();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [escalatorRunning]);

  // Trust Loop Resolution State
  const [resolvingIssueId, setResolvingIssueId] = useState(null);
  const [resolutionMedia, setResolutionMedia] = useState(null);
  const [isResolving, setIsResolving] = useState(false);

  // Scorecard State
  const [scorecardData, setScorecardData] = useState(null);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [scorecardError, setScorecardError] = useState(null);

  const fetchScorecard = async () => {
    setScorecardLoading(true);
    setScorecardError(null);
    try {
      const data = await getDepartmentScorecard();
      if (data.success) {
        setScorecardData({
          scorecards: data.scorecards,
          aiInsights: data.aiInsights
        });
      } else {
        setScorecardError('Failed to generate scorecard data.');
      }
    } catch (err) {
      console.error(err);
      setScorecardError('An error occurred while fetching the scorecard.');
    } finally {
      setScorecardLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    // Load cached city bulletin on mount
    getCityBulletin(false)
      .then(data => { if (data.success) setBulletinData(data.data); })
      .catch(() => { })
      .finally(() => setBulletinLoading(false));
  }, []);

  const fetchIssues = async () => {
    try {
      setIssuesLoading(true);
      const res = await getIssues();
      if (res.success) {
        setIssues(res.issues || []);
      }
    } catch (err) {
      console.error('Failed to fetch issues for board:', err);
    } finally {
      setIssuesLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (newStatus === 'resolved') {
      setResolvingIssueId(id);
      return;
    }
    try {
      await updateIssue(id, { status: newStatus });
      setIssues(prev => prev.map(issue => issue.id === id ? { ...issue, status: newStatus } : issue));
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to update status');
    }
  };

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setResolutionMedia(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitResolutionProof = async () => {
    if (!resolutionMedia) {
      alert("Please upload a proof of resolution image.");
      return;
    }
    setIsResolving(true);
    try {
      const res = await resolveIssue(resolvingIssueId, resolutionMedia);
      if (res.success) {
        alert(res.message);
        setIssues(prev => prev.map(issue => issue.id === resolvingIssueId ? {
          ...issue,
          status: 'resolved',
          resolution_media_url: resolutionMedia,
          resolution_proof_explanation: res.verification?.explanation
        } : issue));
        setResolvingIssueId(null);
        setResolutionMedia(null);
      } else {
        alert('AI rejected the proof: ' + res.message + '\n\nReason: ' + res.verification?.explanation);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to submit resolution proof.");
    } finally {
      setIsResolving(false);
    }
  };

  const columns = [
    { id: 'reported', title: 'Reported', color: 'bg-blue-50 border-blue-200' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-50 border-yellow-200' },
    { id: 'escalated', title: 'Escalated 🚨', color: 'bg-red-50 border-red-200' },
    { id: 'resolved', title: 'Resolved', color: 'bg-green-50 border-green-200' }
  ];


  const generateQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getActionQueue();
      if (result.success) {
        setQueueData(result.data);
      } else {
        setError('Failed to generate action queue');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while communicating with the server.');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const generateOracleInsights = async () => {
    setOracleLoading(true);
    setOracleError(null);
    try {
      const res = await axios.get('/api/dashboard/oracle-insights');
      if (res.data?.success) {
        setOracleData(res.data.data);
      } else {
        setOracleError('Failed to load insights.');
      }
    } catch (err) {
      console.error(err);
      setOracleError('Failed to communicate with Oracle.');
    } finally {
      setOracleLoading(false);
    }
  };

  const triggerEscalator = async () => {
    setEscalatorRunning(true);
    setEscalatorToast({ message: 'Running autonomous SLA check...', type: 'info' });
    try {
      const res = await axios.post('/api/escalator/run');
      if (res.data?.success) {
        setEscalatorToast({ message: `Escalator complete. Processed ${res.data.log?.length || 0} actions.`, type: 'success' });
        fetchIssues();
      } else {
        setEscalatorToast({ message: 'Escalator run failed.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setEscalatorToast({ message: 'Error triggering escalator.', type: 'error' });
    } finally {
      setEscalatorRunning(false);
      setTimeout(() => setEscalatorToast(null), 4000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Government Accountability Portal</h1>
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl flex items-start gap-3">
          <span className="text-xl mt-0.5">🌐</span>
          <div>
            <p className="font-semibold text-sm">Public View — Transparency Engine</p>
            <p className="text-sm mt-0.5 opacity-90">
              This dashboard is publicly accessible. Citizens, journalists, and community leaders use this data to monitor government response times, track SLA compliance, and hold departments accountable.
            </p>
          </div>
        </div>
      </div>
      {/* AI Action Queue Section */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <span>🤖</span> AI Action Queue
          </h2>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <button
              onClick={generateQueue}
              disabled={loading}
              className="px-5 py-2.5 bg-civic-primary text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Generate Queue'
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {loading && !queueData && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Gemini is analyzing all open issues...</p>
            <p className="text-sm mt-2">This may take a few moments.</p>
          </div>
        )}

        {queueData && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
              <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2">Situation Summary</h3>
              <p className="text-blue-800">{queueData.summary}</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 text-lg">Ranked Actions</h3>
              {queueData.action_queue?.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50 hover:bg-white transition-colors shadow-sm">
                  <div className="flex items-center gap-3 sm:w-1/4 sm:flex-col sm:items-start sm:gap-2">
                    <div className="text-2xl font-black text-gray-300">#{item.rank}</div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getUrgencyColor(item.urgency)} uppercase tracking-wide`}>
                      {item.urgency}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-lg mb-1">{item.action}</p>
                    <p className="text-gray-600 text-sm mb-3">{item.reason}</p>
                    <a href={`/issues/${item.issue_id}`} className="inline-flex items-center text-civic-primary hover:text-blue-700 font-medium text-sm">
                      View Issue <span className="ml-1">→</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {queueData.department_focus && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mt-6">
                <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-2">Department Focus</h3>
                <p className="text-amber-800">{queueData.department_focus}</p>
              </div>
            )}

            {queueData.generated_at && (
              <p className="text-xs text-gray-400 text-right mt-4">
                Last generated: {new Date(queueData.generated_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Department Performance Scorecard Section */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <span>📊</span> Department Performance Scorecard
          </h2>
          <button
            onClick={fetchScorecard}
            disabled={scorecardLoading}
            className="mt-4 sm:mt-0 px-5 py-2.5 bg-civic-primary text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center gap-2"
          >
            {scorecardLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate Scorecard'
            )}
          </button>
        </div>

        {scorecardError && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
            {scorecardError}
          </div>
        )}

        {scorecardLoading && !scorecardData && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Analyzing department performance and generating grades...</p>
            <p className="text-sm mt-2">Gemini is compiling stats and writing AI commentary.</p>
          </div>
        )}

        {scorecardData && (
          <div className="space-y-6">
            {scorecardData.aiInsights?.ai_commentary && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
                <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span>💡</span> AI Performance Analysis
                  {scorecardData.aiInsights.overall_city_score !== undefined && (
                    <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                      City Index: {scorecardData.aiInsights.overall_city_score}/100
                    </span>
                  )}
                </h3>
                <p className="text-blue-800 leading-relaxed">{scorecardData.aiInsights.ai_commentary}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-blue-900">
                  <span>🏆 Top Performer: <span className="underline">{scorecardData.aiInsights.top_performer}</span></span>
                  <span>⚠️ Needs Improvement: <span className="underline">{scorecardData.aiInsights.needs_improvement}</span></span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scorecardData.scorecards?.map((card, idx) => {
                const getGradeColor = (grade) => {
                  switch (grade) {
                    case 'A': return 'text-green-600 bg-green-50 border-green-200';
                    case 'B': return 'text-blue-600 bg-blue-50 border-blue-200';
                    case 'C': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
                    case 'D': return 'text-red-600 bg-red-50 border-red-200';
                    default: return 'text-gray-600 bg-gray-50 border-gray-200';
                  }
                };

                const getBarColor = (grade) => {
                  switch (grade) {
                    case 'A': return 'bg-green-500';
                    case 'B': return 'bg-blue-500';
                    case 'C': return 'bg-yellow-500';
                    case 'D': return 'bg-red-500';
                    default: return 'bg-gray-500';
                  }
                };

                return (
                  <div key={idx} className="p-5 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white transition-all shadow-sm flex items-start gap-4">
                    <div className={`w-16 h-16 shrink-0 rounded-xl flex flex-col items-center justify-center border font-black text-3xl ${getGradeColor(card.grade)}`}>
                      {card.grade}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900 text-lg truncate pr-2" title={card.department}>
                          {card.department}
                        </h4>
                        <span className="text-sm font-bold text-gray-500 shrink-0">
                          {card.score}/100
                        </span>
                      </div>

                      {/* Mini progress bars */}
                      <div className="space-y-2 mb-3">
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-gray-500 mb-0.5">
                            <span>Resolution Rate</span>
                            <span>{card.resolutionRate}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getBarColor(card.grade)}`}
                              style={{ width: `${card.resolutionRate}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-gray-500 mb-0.5">
                            <span>SLA Compliance</span>
                            <span>{card.slaCompliance}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getBarColor(card.grade)}`}
                              style={{ width: `${card.slaCompliance}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs text-gray-400 font-medium">
                        <span>Total Issues: <strong>{card.total}</strong></span>
                        <span>Resolved: <strong className="text-green-600">{card.resolved}</strong></span>
                        {card.escalated > 0 && <span className="text-red-500">Escalated: <strong>{card.escalated}</strong></span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {scorecardData.aiInsights?.key_recommendation && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>🎯</span> Key Recommendation
                </h3>
                <p className="text-amber-800 leading-relaxed font-medium">{scorecardData.aiInsights.key_recommendation}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Civic Oracle Section */}
      <section className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-sm border border-indigo-100 p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
            <span>🔮</span> Civic Oracle Insights
          </h2>
          <button
            onClick={generateOracleInsights}
            disabled={oracleLoading}
            className="mt-4 sm:mt-0 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md disabled:bg-indigo-300 flex items-center gap-2"
          >
            {oracleLoading ? 'Consulting Oracle...' : 'Generate Predictive Report'}
          </button>
        </div>

        {oracleError && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
            {oracleError}
          </div>
        )}

        {oracleLoading && !oracleData && (
          <div className="text-center py-12 text-indigo-400">
            <div className="animate-pulse flex flex-col items-center">
              <span className="text-4xl mb-3">✨</span>
              <p className="text-lg font-medium">Analyzing historical data patterns...</p>
            </div>
          </div>
        )}

        {oracleData && (
          <div className="space-y-6">
            <div className="bg-white border border-indigo-100 rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-2">City Health Summary</h3>
              <p className="text-gray-800 font-medium text-lg">{oracleData.summary}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-5 shadow-sm border border-red-100">
                <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2">
                  <span>⚠️</span> Predicted Risks
                </h3>
                {oracleData.predicted_risks?.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No imminent risks detected.</p>
                ) : (
                  <ul className="space-y-4">
                    {oracleData.predicted_risks?.map((risk, idx) => (
                      <li key={idx} className="border-l-4 border-red-400 pl-3">
                        <strong className="block text-gray-800">{risk.risk_title}</strong>
                        <span className="text-sm text-gray-600">{risk.description}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm border border-purple-100">
                <h3 className="font-bold text-purple-700 mb-4 flex items-center gap-2">
                  <span>🔥</span> Predicted Hotspots
                </h3>
                {!oracleData.predicted_hotspots || oracleData.predicted_hotspots.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No hotspots predicted.</p>
                ) : (
                  <ul className="space-y-3">
                    {oracleData.predicted_hotspots.map((hotspot, idx) => (
                      <li key={idx} className="text-sm text-gray-700 border-l-4 border-purple-400 pl-3 py-1.5 flex flex-wrap items-center">
                        <span className="font-semibold text-gray-800">{hotspot.area}</span>
                        <span className="text-gray-400 mx-2">|</span>
                        <span className="text-gray-600">{hotspot.predicted_issue_type}</span>
                        <span className="text-gray-400 mx-2">|</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${hotspot.confidence?.toLowerCase() === 'high'
                            ? 'bg-red-50 text-red-700 border border-red-100'
                            : hotspot.confidence?.toLowerCase() === 'medium'
                              ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                              : 'bg-green-50 text-green-700 border border-green-100'
                          }`}>
                          {hotspot.confidence}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm border border-green-100">
                <h3 className="font-bold text-green-700 mb-4 flex items-center gap-2">
                  <span>💡</span> Strategic Advice
                </h3>
                <ul className="space-y-3">
                  {oracleData.strategic_advice?.map((advice, idx) => (
                    <li key={idx} className="flex gap-2 items-start text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{advice}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* City Bulletin Section */}
      {(bulletinData || bulletinLoading) && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <span>📰</span> City Infrastructure Report
            </h2>
            <button
              onClick={() => {
                setBulletinLoading(true);
                getCityBulletin(true)
                  .then(data => { if (data.success) setBulletinData(data.data); })
                  .catch(() => { })
                  .finally(() => setBulletinLoading(false));
              }}
              disabled={bulletinLoading}
              className="px-4 py-2 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors disabled:bg-gray-400 text-sm flex items-center gap-2"
            >
              {bulletinLoading ? 'Generating...' : '↺ Refresh Report'}
            </button>
          </div>

          {bulletinLoading && !bulletinData ? (
            <div className="text-center py-10 text-gray-400 animate-pulse">
              <span className="text-4xl block mb-2">📊</span>
              <p>Synthesizing city infrastructure data...</p>
            </div>
          ) : bulletinData ? (
            <div className="space-y-5">
              {/* Health Score Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                  <div className={`text-4xl font-extrabold ${bulletinData.city_health_score >= 70 ? 'text-green-600' :
                      bulletinData.city_health_score >= 40 ? 'text-amber-500' : 'text-red-500'
                    }`}>{bulletinData.city_health_score}</div>
                  <div className="text-xs text-gray-400 font-semibold mt-1">City Health Score</div>
                  <div className={`text-xs font-bold mt-1 ${bulletinData.health_trend === 'improving' ? 'text-green-600' :
                      bulletinData.health_trend === 'declining' ? 'text-red-500' : 'text-blue-500'
                    }`}>
                    {bulletinData.health_trend === 'improving' ? '↑' : bulletinData.health_trend === 'declining' ? '↓' : '→'} {bulletinData.health_label}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                  <div className="text-4xl font-extrabold text-blue-600">{bulletinData.avg_resolution_time_estimate || 'N/A'}</div>
                  <div className="text-xs text-gray-400 font-semibold mt-1">Avg Resolution</div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <div className="text-xs text-green-500 font-bold uppercase tracking-wider mb-1">Best Dept</div>
                  <div className="text-sm font-bold text-green-800 leading-tight">{bulletinData.top_performing_department || 'N/A'}</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <div className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Needs Attention</div>
                  <div className="text-sm font-bold text-red-800 leading-tight">{bulletinData.worst_performing_department || 'N/A'}</div>
                </div>
              </div>

              {/* Bulletin Text */}
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">This Week's Bulletin</h3>
                  {bulletinData.primary_cities_analyzed && bulletinData.primary_cities_analyzed.length > 0 && (
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      📍 {bulletinData.primary_cities_analyzed.join(', ')}
                    </span>
                  )}
                </div>
                <p className="text-gray-700 leading-relaxed">{bulletinData.weekly_bulletin}</p>
              </div>

              {/* Actionable Intel Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bulletinData.critical_alerts && bulletinData.critical_alerts.length > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">🚨 Critical Alerts</h3>
                    <ul className="space-y-2 text-sm text-red-900">
                      {bulletinData.critical_alerts.map((alert, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-0.5">•</span>
                          <span>{alert}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {bulletinData.public_advisories && bulletinData.public_advisories.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-2">📢 Public Advisories</h3>
                    <ul className="space-y-2 text-sm text-yellow-900">
                      {bulletinData.public_advisories.map((adv, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-0.5">•</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {bulletinData.trending_issues && bulletinData.trending_issues.length > 0 && (
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">📈 Trending Issues</h3>
                    <ul className="space-y-2 text-sm text-purple-900">
                      {bulletinData.trending_issues.map((trend, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-0.5">•</span>
                          <span>{trend}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Investment Priorities */}
              {bulletinData.investment_priorities?.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">🏗️ Top Investment Priorities</h3>
                  <ol className="space-y-2">
                    {bulletinData.investment_priorities.map((p, i) => (
                      <li key={i} className="flex gap-3 items-start text-sm text-amber-900">
                        <span className="font-black text-amber-400 shrink-0">#{i + 1}</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {bulletinData.generated_at && (
                <p className="text-xs text-gray-400 text-right">
                  Generated: {new Date(bulletinData.generated_at).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          ) : null}
        </section>
      )}

      {/* Issue Management Board Section */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <span>📋</span> Issue Management Board
        </h2>

        {issuesLoading ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="animate-spin h-8 w-8 text-civic-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Loading issues...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {columns.map(col => (
              <div key={col.id} className={`rounded-xl border ${col.color} flex flex-col h-[600px] overflow-hidden`}>
                <div className="p-4 border-b border-black/10 flex-shrink-0">
                  <h3 className="font-bold text-gray-800 flex justify-between items-center">
                    {col.title}
                    <span className="bg-white px-2 py-0.5 rounded-full text-xs shadow-sm font-semibold text-gray-700">
                      {issues.filter(i => (i.status || 'reported') === col.id).length}
                    </span>
                  </h3>
                </div>
                <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                  {issues.filter(i => (i.status || 'reported') === col.id).map(issue => (
                    <div key={issue.id} className="bg-white p-3.5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <Link to={`/issues/${issue.id}`} className="font-bold text-civic-primary hover:text-blue-800 mb-1.5 block leading-snug capitalize">
                        {String(issue.analysis?.category || issue.category || 'Civic Issue').replace(/_/g, ' ')}
                      </Link>
                      <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                        {issue.analysis?.ai_description || issue.ai_description || 'No detailed description provided.'}
                      </p>
                      <div className="flex justify-between items-end mt-2 pt-2 border-t border-gray-50">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Assigned To</span>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 truncate max-w-[110px] font-medium" title={issue.routing?.assigned_agency || issue.department || 'Unassigned'}>
                            {issue.routing?.assigned_agency || issue.department || 'Unassigned'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 text-right">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Status</span>
                          <select
                            className="text-xs border border-gray-200 rounded p-1 cursor-pointer bg-gray-50 hover:bg-white focus:outline-none focus:border-civic-primary font-medium"
                            value={issue.status || 'reported'}
                            onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                          >
                            {issue.status !== 'escalated' && <option value="reported">Reported</option>}
                            {issue.status !== 'escalated' && <option value="in_progress">In Progress</option>}
                            {issue.status === 'escalated' && <option value="escalated">Escalated 🚨</option>}
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  {issues.filter(i => (i.status || 'reported') === col.id).length === 0 && (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-400 text-sm py-4 italic">No issues</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Resolution Proof Modal */}
      {resolvingIssueId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>📸</span> Proof of Resolution
              </h3>
              <button
                onClick={() => { setResolvingIssueId(null); setResolutionMedia(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                To close the trust loop with citizens, you must provide a photo showing that this issue has been physically fixed. Our AI will verify the image before marking it as resolved.
              </p>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Proof Image</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMediaUpload}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-civic-primary file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              </div>

              {resolutionMedia && (
                <div className="mb-5 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative">
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] uppercase font-bold px-2 py-1 rounded">Preview</div>
                  <img src={resolutionMedia} alt="Resolution Proof" className="w-full h-48 object-cover" />
                </div>
              )}

              <button
                onClick={submitResolutionProof}
                disabled={isResolving || !resolutionMedia}
                className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:bg-green-300 flex justify-center items-center gap-2"
              >
                {isResolving ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying Proof...
                  </>
                ) : (
                  'Submit & Verify Resolution'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Toast Notification for Escalator */}
      {escalatorToast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 transition-opacity duration-300 ${
          escalatorToast.type === 'success' ? 'bg-green-600 text-white' : 
          escalatorToast.type === 'error' ? 'bg-red-600 text-white' : 
          'bg-gray-800 text-white'
        }`}>
          {escalatorToast.message}
        </div>
      )}
    </div>
  );
}
