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

  const prompt = `You are a legal routing AI for a civic complaint system in India. 
You have access to the complete Municipal Service Level Agreement document.

Read this SLA document carefully:
===SLA DOCUMENT START===
${slaDoc}
===SLA DOCUMENT END===

A citizen has reported the following civic issue:
- Category: ${analysisResult.category}
- Severity Score: ${analysisResult.severity_score}
- AI Description: ${analysisResult.ai_description}
- Suggested Department: ${analysisResult.suggested_department}
- Urgent: ${analysisResult.is_urgent}
- Hazard Tags: ${analysisResult.hazard_tags.join(', ')}

Based ONLY on the SLA document rules, determine the exact SLA timeline, the responsible agency, and generate a formal complaint.
If the SLA does not cover this exact issue, make a reasonable guess based on the closest match.

Return this exact JSON structure:
{
  "assigned_agency": "<Name of the exact department/agency from the SLA>",
  "sla_tier": "<The priority tier from the SLA (e.g. Tier 1 - Emergency, Tier 2 - High, etc.)>",
  "sla_deadline_hours": <The number of hours to resolve according to SLA. Only integer.>,
  "cited_sla_rule": "<The specific rule or section from the SLA that applies>",
  "formal_complaint": "<A formal, professionally written 2-3 paragraph complaint that cites the specific SLA section and demands action. Do not include markdown formatting or newlines in the string, use \\n for newlines.>"
}

Respond ONLY with raw JSON. No markdown. No explanation. No text before or after the JSON object.`;

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
  return {
    assigned_agency: "Municipal Corporation",
    sla_tier: "Tier 3 - Standard",
    sla_deadline_hours: 72,
    cited_sla_rule: "Standard Municipal Guidelines Section 1.1",
    formal_complaint: "A citizen has reported a civic infrastructure issue requiring attention. Please inspect and resolve according to standard municipal guidelines."
  };
}

module.exports = { routeIssue };
