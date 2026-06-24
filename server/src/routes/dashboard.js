const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { proModel, parseGeminiJSON } = require('../utils/gemini');

router.get('/stats', async (req, res) => {
  try {
    const snapshot = await db.collection('issues').get();
    const issues = snapshot.docs.map(doc => doc.data());

    const total = issues.length;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const resolvedThisWeek = issues.filter(i => {
      if (i.status !== 'resolved') return false;
      const updatedAt = i.updatedAt?.toDate ? i.updatedAt.toDate() : new Date(i.updatedAt);
      return updatedAt >= weekAgo;
    }).length;

    const active = issues.filter(i => ['reported', 'in_progress'].includes(i.status)).length;

    const departments = new Set(
      issues.map(i => i.routing?.assigned_agency || i.analysis?.suggested_department).filter(Boolean)
    );

    res.json({
      success: true,
      stats: {
        total_issues: total,
        resolved_this_week: resolvedThisWeek,
        active_reports: active,
        departments_engaged: departments.size,
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.json({
      success: true,
      stats: {
        total_issues: 0,
        resolved_this_week: 0,
        active_reports: 0,
        departments_engaged: 0,
      }
    });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.collection('issues').where('userId', '==', userId).get();
    const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : { civic_points: 0, badges: [] };

    res.json({ success: true, issues, userData });
  } catch (error) {
    console.error('User dashboard error:', error);
    res.status(500).json({ error: 'Failed to get user data', details: error.message });
  }
});

router.post('/action-queue', async (req, res) => {
  try {
    const snapshot = await db.collection('issues')
      .where('status', 'in', ['reported', 'in_progress', 'escalated'])
      .limit(30)
      .get();
      
    const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const prompt = `You are an AI assistant for a municipal authority dashboard.
Below is a list of civic issues currently open in the city.
Your job is to create a prioritized action queue — rank these issues 
and tell the authority what to do TODAY.

OPEN ISSUES:
${JSON.stringify(issues.map(i => {
  let slaTimestamp = i.sla_deadline_timestamp;
  if (slaTimestamp && typeof slaTimestamp.toDate === 'function') {
    slaTimestamp = slaTimestamp.toDate();
  } else if (slaTimestamp && slaTimestamp._seconds) {
    slaTimestamp = new Date(slaTimestamp._seconds * 1000);
  } else if (slaTimestamp) {
    slaTimestamp = new Date(slaTimestamp);
  }
  
  return {
    id: i.id,
    category: i.analysis?.category || i.category,
    severity: i.analysis?.severity_score || i.severity_score,
    status: i.status,
    department: i.routing?.assigned_agency || i.department,
    hours_overdue: slaTimestamp ? 
      Math.max(0, Math.round((Date.now() - slaTimestamp.getTime()) / 3600000)) : 0,
    description: i.analysis?.ai_description || i.ai_description,
    upvotes: i.upvotes,
    location: i.location?.address || 'Unknown'
  };
}), null, 2)}

Return ONLY raw JSON. No markdown. No explanation.
{
  "generated_at": "<ISO timestamp>",
  "summary": "<2 sentence overview of current situation>",
  "action_queue": [
    {
      "rank": 1,
      "issue_id": "<id>",
      "action": "<specific action to take, 1 sentence>",
      "reason": "<why this is ranked here, 1 sentence>",
      "urgency": "critical|high|medium|low"
    }
  ],
  "department_focus": "<which department needs most attention today and why, 1-2 sentences>"
}`;

    const result = await proModel.generateContent(prompt);
    let parsed = parseGeminiJSON(result.response.text());

    if (!parsed) {
       const retryResult = await proModel.generateContent(
        prompt + "\\n\\nCRITICAL: Your previous response could not be parsed as JSON. Respond with ONLY a valid JSON object. Nothing else."
      );
      parsed = parseGeminiJSON(retryResult.response.text());
    }

    if (!parsed) {
      throw new Error("Failed to parse Gemini response as JSON");
    }

    res.json({ success: true, data: parsed });

  } catch (error) {
    console.error('Action Queue Error:', error);
    res.status(500).json({ error: 'Failed to generate action queue', details: error.message });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .orderBy('civic_points', 'desc')
      .limit(10)
      .get();
      
    const leaderboard = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.displayName || data.name || 'Anonymous Citizen',
        points: data.civic_points || 0,
        reports: data.reports_count || 0
      };
    });
    
    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    // Fallback if no index exists yet
    if (error.message.includes('index')) {
      const snapshot = await db.collection('users').get();
      let users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.displayName || data.name || 'Anonymous Citizen',
          points: data.civic_points || 0,
          reports: data.reports_count || 0
        };
      });
      users.sort((a, b) => b.points - a.points);
      res.json({ success: true, leaderboard: users.slice(0, 10) });
    } else {
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  }
});

router.get('/oracle-insights', async (req, res) => {
  try {
    const snapshot = await db.collection('issues')
      .orderBy('created_at', 'desc')
      .limit(100)
      .get();
      
    const issues = snapshot.docs.map(doc => doc.data());
    
    const prompt = `You are the "Civic Oracle", an advanced AI data analyst for the city's municipal authority.
Analyze the following recent civic issues and provide a "Predictive Insights & Strategy Report".
Focus on spotting trends, predicting potential major failures, identifying future hotspots, and providing strategic advice.

ISSUES DATA:
${JSON.stringify(issues.map(i => ({
  category: i.category || i.analysis?.category,
  severity: i.severity_score || i.analysis?.severity_score,
  status: i.status,
  department: i.department || i.routing?.assigned_agency,
  location: i.location?.address
})), null, 2)}

Respond with ONLY raw JSON in the following format:
{
  "summary": "<High-level 2-sentence summary of the city's current infrastructure health>",
  "predicted_risks": [
    {
      "risk_title": "<Short title, e.g., 'Imminent Pipeline Failure in Ward 14'>",
      "description": "<Why you predict this based on the data>",
      "severity": "High|Medium|Low"
    }
  ],
  "predicted_hotspots": [
    {
      "area": "<Area or neighborhood name, e.g., 'Vijay Nagar'>",
      "predicted_issue_type": "<Predicted issue type, e.g., 'Water Leakage'>",
      "confidence": "High|Medium|Low"
    }
  ],
  "strategic_advice": [
    "<Actionable advice 1>",
    "<Actionable advice 2>"
  ]
}`;

    const result = await proModel.generateContent(prompt);
    let parsed = parseGeminiJSON(result.response.text());
    
    if (!parsed) {
      const retryResult = await proModel.generateContent(
        prompt + "\n\nCRITICAL: Your previous response could not be parsed as JSON. Respond with ONLY a valid JSON object. Nothing else."
      );
      parsed = parseGeminiJSON(retryResult.response.text());
    }

    if (!parsed) {
      throw new Error("Failed to parse Gemini response as JSON");
    }

    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Oracle Insights Error:', error);
    if (error.message.includes('index')) {
      res.json({
        success: true, 
        data: {
          summary: "System is compiling historical data index. Please check back later.",
          predicted_risks: [],
          predicted_hotspots: [],
          strategic_advice: ["Please wait while the database indexes recent reports."]
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to generate insights', details: error.message });
    }
  }
});

module.exports = router;
