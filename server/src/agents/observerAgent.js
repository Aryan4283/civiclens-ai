const { flashModel } = require('../utils/gemini');
const { parseGeminiJSON } = require('../utils/gemini');

/**
 * Analyze a civic issue from a base64-encoded image/video.
 * @param {string} mediaBase64 - Full data-URL: "data:image/jpeg;base64,..."
 * @param {string} mediaType   - 'image' | 'video'
 * @param {string} userDescription - Optional text provided by user
 */
async function analyzeMedia(mediaBase64, mediaType = 'image', userDescription = '') {
  const prompt = `You are an AI agent analyzing a civic infrastructure issue reported by a citizen.
  
Analyze this ${mediaType} carefully and identify the civic infrastructure problem shown.
If the citizen provided any additional text description (which will be passed below if available) or if there is text in the image in a regional language (e.g., Hindi, Marathi), TRANSLATE it to English for your internal analysis.

Respond ONLY with raw JSON. No markdown. No explanation. No text before or after the JSON object.

Return this exact JSON structure:
{
  "category": "one of: pothole, water_leak, streetlight, waste, road_damage, flooding, other",
  "severity_score": <integer 1-5 where 1=minor cosmetic issue, 3=moderate public inconvenience, 5=immediate safety emergency>,
  "ai_description": "<2-3 sentences describing the issue specifically: what you see, approximate dimensions or scale if visible, immediate risks. THIS MUST BE IN ENGLISH, translated from regional language if necessary>",
  "suggested_department": "one of: PWD, Water Board, Electricity Department, Municipal Sanitation, Municipal Corporation",
  "is_urgent": <true if severity >= 4, false otherwise>,
  "hazard_tags": ["array of applicable tags from: traffic_risk, vehicle_damage, pedestrian_hazard, health_risk, flood_risk, electrical_hazard, property_damage, public_safety"]
}`;

  try {
    // mediaBase64 arrives as "data:image/jpeg;base64,XXXX..."
    const [header, base64Data] = mediaBase64.split(',');
    const mimeType = header.match(/:(.*?);/)[1]; // e.g. "image/jpeg"

    const parts = [
      { inlineData: { data: base64Data, mimeType } },
      prompt
    ];
    
    if (userDescription) {
      parts.push(`\nUSER DESCRIPTION PROVIDED (translate to English if needed):\n"${userDescription}"`);
    }

    const result = await flashModel.generateContent(parts);

    const responseText = result.response.text();
    const parsed = parseGeminiJSON(responseText);

    if (!parsed) {
      parts[1] = `${prompt}\n\nCRITICAL: Your previous response could not be parsed as JSON. Respond with ONLY a valid JSON object. Nothing else.`;
      const retry = await flashModel.generateContent(parts);
      return parseGeminiJSON(retry.response.text()) || getDefaultAnalysis();
    }

    return parsed;
  } catch (error) {
    console.error('Observer Agent error:', error);
    return getDefaultAnalysis();
  }
}

function getDefaultAnalysis() {
  return {
    category: 'other',
    severity_score: 3,
    ai_description: 'Unable to analyze media automatically. Manual review required.',
    suggested_department: 'Municipal Corporation',
    is_urgent: false,
    hazard_tags: []
  };
}

module.exports = { analyzeMedia };
