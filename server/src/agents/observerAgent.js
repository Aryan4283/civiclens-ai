const { flashModel } = require('../utils/gemini');
const { parseGeminiJSON } = require('../utils/gemini');

const tools = [{
  functionDeclarations: [
    {
      name: "classify_civic_issue",
      description: "Classifies a civic infrastructure issue from visual media and extracts structured data for routing and storage",
      parameters: {
        type: "OBJECT",
        properties: {
          category: {
            type: "STRING",
            enum: ["pothole", "water_leak", "streetlight", "waste", "road_damage", "flooding", "other"],
            description: "The type of civic infrastructure issue detected"
          },
          severity_score: {
            type: "INTEGER",
            description: "Severity from 1 (minor) to 5 (critical safety emergency)"
          },
          ai_description: {
            type: "STRING",
            description: "Detailed 2-3 sentence description of the issue including scale, location context, and immediate risks"
          },
          suggested_department: {
            type: "STRING",
            enum: ["PWD", "Water Board", "Electricity Department", "Municipal Sanitation", "Municipal Corporation"],
            description: "Government department responsible for this issue type"
          },
          is_urgent: {
            type: "BOOLEAN",
            description: "True if severity is 4 or 5"
          },
          hazard_tags: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Applicable hazard tags from: traffic_risk, vehicle_damage, pedestrian_hazard, health_risk, flood_risk, electrical_hazard, property_damage, public_safety"
          }
        },
        required: ["category", "severity_score", "ai_description", "suggested_department", "is_urgent", "hazard_tags"]
      }
    }
  ]
}];

/**
 * Analyze a civic issue from a base64-encoded image/video.
 * @param {string} mediaBase64 - Full data-URL: "data:image/jpeg;base64,..."
 * @param {string} mediaType   - 'image' | 'video'
 * @param {string} userDescription - Optional text provided by user
 */
async function analyzeMedia(mediaBase64, mediaType = 'image', userDescription = '') {
  const [header, base64Data] = mediaBase64.split(',');
  const mimeType = header.match(/:(.*?);/)[1];

  let prompt = `You are an expert civic infrastructure analysis AI. 
Analyze this ${mediaType} and call the classify_civic_issue function with your findings.

CRITICAL SEVERITY GUIDELINES:
- Score 1: Very minor, isolated (e.g., small crack, single wrapper).
- Score 2: Noticeable but localized (e.g., small pothole, overflowing street bin).
- Score 3: Moderate hazard (e.g., large pothole, broken streetlight, moderate waste).
- Score 4: Severe hazard (e.g., massive garbage pile spilling onto road, deep crater blocking traffic, active flooding).
- Score 5: Critical safety emergency (e.g., collapsed bridge, severe flood, live electrical wires).

Pay close attention to the scale/volume of the issue and if it is blocking roads or endangering public health. Do not underestimate severe hazards.`;

  if (userDescription) {
    prompt += `\nCITIZEN NOTES (translate to English if needed):\n"${userDescription}"`;
  }

  try {
    const result = await flashModel.generateContent({
      contents: [{ 
        role: 'user', 
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]
      }],
      tools: tools,
      tool_config: { function_calling_config: { mode: "ANY" } }
    });

    const response = result.response;
    const candidate = response.candidates[0];
    
    // Extract the function call that Gemini autonomously made
    const functionCall = candidate.content?.parts?.find(p => p.functionCall);
    
    if (functionCall) {
      console.log('✅ Gemini autonomously called:', functionCall.functionCall.name);
      return functionCall.functionCall.args; // This IS the structured data
    }
    
    // Fallback to JSON parsing if function call not returned
    console.warn('Function call not returned, falling back to JSON parse');
    return parseGeminiJSON(response.text()) || getDefaultAnalysis();
    
  } catch (error) {
    console.error('Observer Agent error:', error);
    return getDefaultAnalysis();
  }
}

function getDefaultAnalysis() {
  return {
    category: 'other',
    severity_score: 3,
    confidence: 0.5,
    ai_description: 'Unable to analyze media automatically. Manual review required.',
    affected_population_estimate: 'street',
    suggested_department: 'Municipal Corporation',
    is_urgent: false,
    recommended_interim_action: 'Please have a field officer inspect the site.',
    hazard_tags: []
  };
}

async function verifyResolution(issueCategory, issueDescription, resolutionMediaBase64, mediaType = 'image') {
  const prompt = `You are a strict Civic Quality Assurance Agent. 
An authority claims to have resolved a civic issue. 
Original Issue Category: ${issueCategory}
Original Issue Description: ${issueDescription}

Analyze this new ${mediaType} provided by the authority as proof of resolution. 
Does the image clearly show that the issue described above has been physically resolved or repaired? 
NOTE: For hackathon testing and demonstrations, please be highly lenient. For road damage, dirt/gravel fills or temporary patching are valid. For water leaks, dried ground or pipes are valid. For waste, an empty street or covered area is valid. Accept reasonable visual approximations of a fix. You MUST mark it as resolved if any effort to fix it is visible.
Respond ONLY with raw JSON. No markdown. No explanation.
Return exactly this JSON structure:
{
  "is_resolved": <boolean true or false>,
  "confidence": <float 0.0-1.0>,
  "explanation": "<1-2 sentences explaining why you believe it is or isn't resolved based ONLY on visual evidence>"
}`;

  try {
    const [header, base64Data] = resolutionMediaBase64.split(',');
    const mimeType = header.match(/:(.*?);/)[1];

    const parts = [
      { inlineData: { data: base64Data, mimeType } },
      prompt
    ];

    const result = await flashModel.generateContent(parts);
    const responseText = result.response.text();
    const parsed = parseGeminiJSON(responseText);

    if (!parsed) {
      parts[1] = `${prompt}\n\nCRITICAL: Your previous response could not be parsed as JSON. Respond with ONLY a valid JSON object. Nothing else.`;
      const retry = await flashModel.generateContent(parts);
      return parseGeminiJSON(retry.response.text()) || { is_resolved: false, confidence: 0, explanation: 'Failed to parse AI response' };
    }

    return parsed;
  } catch (error) {
    console.error('Observer Agent verifyResolution error:', error);
    return { is_resolved: false, confidence: 0, explanation: 'Server error during verification' };
  }
}

async function analyzeVoiceReport(audioBase64) {
  const prompt = `You are an expert AI agent trained on civic infrastructure analysis for Indian cities.
A citizen has submitted a VOICE RECORDING to report an issue. 
Listen to the audio. It may be in English, Hindi, or a regional language. Translate to English for your analysis.

Based on what the citizen describes in the audio, extract the issue details and return exactly this JSON structure:
{
  "category": "one of: pothole, water_leak, streetlight, waste, road_damage, flooding, open_drain, damaged_footpath, garbage_burning, other",
  "severity_score": <integer 1-5 where 1=minor cosmetic issue, 3=moderate public inconvenience, 5=immediate safety emergency>,
  "confidence": <float 0.0-1.0 — how certain are you about this classification?>,
  "ai_description": "<2-3 sentences summarizing the spoken report, identifying WHAT the issue is and WHERE it is if mentioned>",
  "affected_population_estimate": "<one of: individual, street, neighbourhood, district>",
  "suggested_department": "one of: PWD, Water Board, Electricity Department, Municipal Sanitation, Municipal Corporation",
  "is_urgent": <true if severity >= 4, false otherwise>,
  "recommended_interim_action": "<ONE sentence: what should be done immediately>",
  "hazard_tags": ["array of applicable tags"]
}

Respond ONLY with raw JSON. No markdown. No explanation.`;

  try {
    const [header, base64Data] = audioBase64.split(',');
    const mimeType = header.match(/:(.*?);/)[1];

    const parts = [
      { inlineData: { data: base64Data, mimeType } },
      prompt
    ];

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
    console.error('Observer Agent analyzeVoiceReport error:', error);
    return getDefaultAnalysis();
  }
}

module.exports = { analyzeMedia, verifyResolution, analyzeVoiceReport };
