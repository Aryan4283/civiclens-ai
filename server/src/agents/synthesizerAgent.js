const { db } = require('../config/firebase');
const { proModel, parseGeminiJSON } = require('../utils/gemini');

/**
 * Synthesizer Agent — 4th AI Agent
 * Generates a city health score, weekly bulletin, and investment priorities
 * from the full dataset of civic issues. Designed to be run daily via cron.
 */
async function runSynthesizer() {
  try {
    const snapshot = await db.collection('issues')
      .orderBy('created_at', 'desc')
      .limit(200)
      .get();
    
    const issues = snapshot.docs.map(doc => doc.data());
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Compute basic stats for the prompt
    const resolvedCount = issues.filter(i => i.status === 'resolved').length;
    const escalatedCount = issues.filter(i => i.status === 'escalated').length;
    const openCount = issues.filter(i => ['reported', 'in_progress'].includes(i.status)).length;
    const resolvedThisWeek = issues.filter(i => {
      if (i.status !== 'resolved') return false;
      const updatedAt = i.updatedAt?.toDate ? i.updatedAt.toDate() : new Date(i.updatedAt || 0);
      return updatedAt >= weekAgo;
    }).length;

    // Group by location for area analysis
    const locationGroups = {};
    issues.forEach(i => {
      const loc = i.location?.address?.split(',')[0]?.trim() || 'Unknown Area';
      if (!locationGroups[loc]) locationGroups[loc] = [];
      locationGroups[loc].push(i);
    });

    const prompt = `You are the Civic Synthesizer — an advanced AI city analyst. Today is ${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.

You have access to ${issues.length} civic issue reports. Your job is to synthesize this into a comprehensive City Infrastructure Health Report.

SUMMARY STATISTICS:
- Total Issues: ${issues.length}
- Open/In-Progress: ${openCount}
- Escalated (SLA breached): ${escalatedCount}
- Resolved: ${resolvedCount}
- Resolved This Week: ${resolvedThisWeek}

ISSUE DISTRIBUTION BY CATEGORY:
${JSON.stringify(
  issues.reduce((acc, i) => {
    const cat = i.category || i.analysis?.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {}), null, 2
)}

ISSUE DISTRIBUTION BY LOCATION (top areas):
${JSON.stringify(
  Object.entries(locationGroups)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .map(([area, areaIssues]) => ({
      area,
      total: areaIssues.length,
      categories: [...new Set(areaIssues.map(i => i.category || i.analysis?.category))],
      avg_severity: areaIssues.reduce((sum, i) => sum + (i.analysis?.severity_score || i.severity_score || 3), 0) / areaIssues.length
    })), null, 2
)}

Based on this data, generate a City Infrastructure Health Report.

The weekly_bulletin must read like genuine civic journalism. BE EXTREMELY SPECIFIC about the actual City names (e.g., Mumbai, Indore, Bangalore) and Areas extracted from the addresses. DO NOT just say "the city", but rather "Across Indore and Mumbai..." or "In Bangalore's Whitefield area...". 

The city_health_score should be calculated as: start at 100, deduct 5 for each open issue, deduct 10 for each escalated issue, add 3 for each issue resolved this week. Cap between 0-100.

Return ONLY raw JSON:
{
  "city_health_score": <integer 0-100>,
  "health_trend": "<improving|stable|declining — based on escalated vs resolved ratio>",
  "health_label": "<one of: Excellent, Good, Fair, Poor, Critical — based on score>",
  "primary_cities_analyzed": ["<City 1>", "<City 2>"],
  "weekly_bulletin": "<3-4 sentence journalistic narrative. Explicitly name the cities and areas. E.g., 'This week, infrastructure demands in Mumbai and Indore surged...'>",
  "critical_alerts": [
    "<Specific critical alert mentioning location, e.g., 'Severe waterlogging at Milan Subway, Mumbai.'>"
  ],
  "public_advisories": [
    "<Specific advisory, e.g., 'Citizens in T Nagar, Chennai advised to boil drinking water.'>"
  ],
  "trending_issues": [
    "<E.g., 'Pothole reports in Whitefield have increased by 40%.'>"
  ],
  "investment_priorities": [
    "<Area, City + specific infrastructure type that needs investment>",
    "<Area, City + specific infrastructure type that needs investment>"
  ],
  "top_performing_department": "<Department that resolved the most issues or has fewest breaches>",
  "worst_performing_department": "<Department with most escalated/open issues>",
  "avg_resolution_time_estimate": "<Estimated average resolution time based on open vs resolved, e.g., '~48 hours'>",
  "generated_at": "${now.toISOString()}"
}`;

    const result = await proModel.generateContent(prompt);
    let parsed = parseGeminiJSON(result.response.text());

    if (!parsed) {
      const retry = await proModel.generateContent(
        prompt + "\n\nCRITICAL: Respond with ONLY a valid JSON object. Nothing else."
      );
      parsed = parseGeminiJSON(retry.response.text());
    }

    if (!parsed) {
      throw new Error('Failed to parse Synthesizer response as JSON');
    }

    // Store result in Firestore for caching
    await db.collection('city_reports').doc('latest').set({
      ...parsed,
      updated_at: new Date().toISOString()
    });

    console.log(`[Synthesizer] City health score: ${parsed.city_health_score} (${parsed.health_label})`);
    return { success: true, data: parsed };

  } catch (error) {
    console.error('Synthesizer Agent error:', error);
    // Try to return cached report
    try {
      const cached = await db.collection('city_reports').doc('latest').get();
      if (cached.exists) {
        return { success: true, data: cached.data(), cached: true };
      }
    } catch (_) {}
    return { success: false, error: error.message, data: getDefaultReport() };
  }
}

async function getCachedReport() {
  try {
    const doc = await db.collection('city_reports').doc('latest').get();
    if (doc.exists) return doc.data();
  } catch (_) {}
  return null;
}

function getDefaultReport() {
  return {
    city_health_score: 70,
    health_trend: 'stable',
    health_label: 'Fair',
    primary_cities_analyzed: ['Data compiling...'],
    weekly_bulletin: 'CivicLens is compiling this week\'s city report. Check back shortly for the full analysis.',
    critical_alerts: [],
    public_advisories: [],
    trending_issues: [],
    investment_priorities: ['Data being compiled...'],
    top_performing_department: 'N/A',
    worst_performing_department: 'N/A',
    avg_resolution_time_estimate: 'N/A',
    generated_at: new Date().toISOString()
  };
}

module.exports = { runSynthesizer, getCachedReport };
