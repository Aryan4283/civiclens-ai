import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActionQueue, getIssues, updateIssue } from '../services/api';
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

  const [escalatorRunning, setEscalatorRunning] = useState(false);

  useEffect(() => {
    fetchIssues();
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
    try {
      await updateIssue(id, { status: newStatus });
      setIssues(prev => prev.map(issue => issue.id === id ? { ...issue, status: newStatus } : issue));
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to update status');
    }
  };

  const columns = [
    { id: 'reported', title: 'Reported', color: 'bg-red-50 border-red-200' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-50 border-yellow-200' },
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
    try {
      const res = await axios.post('/api/escalator/run');
      if (res.data?.success) {
        alert(`Escalator run complete. Log:\n${res.data.log.join('\n')}`);
        fetchIssues();
      } else {
        alert('Escalator run failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error triggering escalator.');
    } finally {
      setEscalatorRunning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Authority Dashboard</h1>
      
      {/* AI Action Queue Section */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <span>🤖</span> AI Action Queue
          </h2>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <button
              onClick={triggerEscalator}
              disabled={escalatorRunning}
              className="px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 flex items-center gap-2"
            >
              {escalatorRunning ? 'Running...' : 'Run Escalator (Demo)'}
            </button>
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          hotspot.confidence?.toLowerCase() === 'high' 
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
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                       <Link to={`/issues/${issue.id}`} className="font-bold text-civic-primary hover:text-blue-800 mb-1.5 block leading-snug">
                         {issue.analysis?.category || issue.category || 'Civic Issue'}
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
                             <option value="reported">Reported</option>
                             <option value="in_progress">In Progress</option>
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
    </div>
  );
}
