const fs = require('fs');
const path = require('path');
const { proModel } = require('../utils/gemini');
const { parseGeminiJSON } = require('../utils/gemini');

async function routeIssue(analysisResult, location) {
  // Read SLA document fresh from disk every time
  const slaDoc = fs.readFileSync(
    path.join(__dirname, '../../data/sla_document.md'),
    'utf-8'
  );

  const todayReadable = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const prompt = `You are a senior legal officer and urban planning expert for a municipal corporation in India.
Your role is to route civic complaints with legal precision and human empathy.
Today's date is: ${todayReadable}.

Read the SLA document carefully and use it as your authoritative source of truth for all deadlines and rules:
===SLA DOCUMENT START===
${slaDoc}
===SLA DOCUMENT END===

A citizen has reported the following civic issue:
- Category: ${analysisResult.category}
- Severity Score: ${analysisResult.severity_score}/5
- AI Description: ${analysisResult.ai_description}
- Suggested Department: ${analysisResult.suggested_department}
- Urgent: ${analysisResult.is_urgent}
- Hazard Tags: ${(analysisResult.hazard_tags || []).join(', ') || 'None'}
- Affected Population: ${analysisResult.affected_population_estimate || 'street'}
${location?.address ? `- Location: ${location.address}` : ''}

Based ONLY on the SLA document rules, determine the exact SLA timeline, the responsible agency, and generate a formal complaint.
Calculate the estimated resolution deadline as a real, human-readable date (e.g., "By Monday, 30 June 2025 at 3:00 PM") based on today's date plus the SLA hours.

Return ONLY raw JSON. No markdown. No explanation. No text before or after the JSON object:
{
  "assigned_agency": "<Exact department/agency name from the SLA document>",
  "sla_tier": "<The priority tier from SLA, e.g., 'P1 — Critical (24h)'>",
  "sla_deadline_hours": <integer — number of hours to resolve per SLA>,
  "estimated_resolution_date": "<Human-readable deadline date, e.g., 'By Tuesday, 25 June 2025 at 6:00 PM'>",
  "cited_sla_rule": "<The specific rule/section from the SLA that applies — quote it exactly>",
  "escalation_authority": "<Who gets notified if this breaches SLA>",
  "priority_justification": "<1 sentence: why this exact priority level was assigned, referencing the risk or scale>",
  "formal_complaint": "<A formal, professionally written 3-paragraph complaint. Para 1: what was observed. Para 2: the specific SLA obligation being invoked. Para 3: the demanded action and explicit deadline. No markdown. Use \\n for newlines.>",
  "citizen_next_steps": "<Explain what the CivicLens AI engine will AUTOMATICALLY do on the dashboard if the deadline is breached (e.g. automatically escalating the ticket on the Authority Dashboard, penalizing the department's public compliance score, and auto-drafting an RTI template for the citizen to easily submit). Emphasize that the AI handles the tracking and drafting, so the citizen doesn't have to worry. Write in a reassuring, empowering tone. No numbered lists.>"
}`;

  try {
    const result = await proModel.generateContent(prompt);
    let parsed = parseGeminiJSON(result.response.text());

    if (!parsed) {
      const retryResult = await proModel.generateContent(
        prompt + "\n\nCRITICAL: Your previous response could not be parsed as JSON. Respond with ONLY a valid JSON object. Nothing else."
      );
      parsed = parseGeminiJSON(retryResult.response.text()) || getDefaultRouting();
    }

    return parsed;
  } catch (error) {
    console.error('Router Agent error:', error);
    return getDefaultRouting();
  }
}

function getDefaultRouting() {
  const deadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
  return {
    assigned_agency: "Municipal Corporation",
    sla_tier: "P3 — Medium (72h)",
    sla_deadline_hours: 72,
    estimated_resolution_date: `By ${deadline.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
    cited_sla_rule: "Standard Municipal Guidelines Section 1.1",
    escalation_authority: "Municipal Commissioner",
    priority_justification: "Standard priority assigned based on general civic infrastructure defect.",
    formal_complaint: "A citizen has reported a civic infrastructure issue requiring attention. Please inspect and resolve according to standard municipal guidelines within the SLA timeline.",
    citizen_next_steps: "If this issue is not resolved by the deadline, re-escalate via the CivicLens portal or contact the Municipal Commissioner's office directly."
  };
}

module.exports = { routeIssue };
