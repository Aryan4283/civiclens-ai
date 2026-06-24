const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY || 'placeholder_key';
const genAI = new GoogleGenerativeAI(apiKey);

function createFallbackModel(primaryModelName, fallbackModelNames) {
  const primaryModel = genAI.getGenerativeModel({ model: primaryModelName });
  const fallbackModels = fallbackModelNames.map(m => genAI.getGenerativeModel({ model: m }));

  return {
    async generateContent(...args) {
      try {
        return await primaryModel.generateContent(...args);
      } catch (err) {
        console.warn(`[Gemini] Primary model ${primaryModelName} failed. Trying fallbacks... Error:`, err.message);
        for (const fallbackModel of fallbackModels) {
          try {
            console.log(`[Gemini] Attempting fallback model: ${fallbackModel.model}`);
            return await fallbackModel.generateContent(...args);
          } catch (fallbackErr) {
            console.warn(`[Gemini] Fallback model ${fallbackModel.model} failed. Error:`, fallbackErr.message);
          }
        }
        throw err; // If all else fails, propagate the original error
      }
    },
    startChat(options = {}) {
      const chat = primaryModel.startChat(options);
      
      return {
        async sendMessage(message) {
          try {
            return await chat.sendMessage(message);
          } catch (err) {
            console.warn(`[Gemini] Chat sendMessage failed for primary model ${primaryModelName}. Trying fallbacks... Error:`, err.message);
            for (const fallbackModel of fallbackModels) {
              try {
                console.log(`[Gemini] Attempting fallback chat with model: ${fallbackModel.model}`);
                const fallbackChat = fallbackModel.startChat(options);
                return await fallbackChat.sendMessage(message);
              } catch (fallbackErr) {
                console.warn(`[Gemini] Fallback chat with model ${fallbackModel.model} failed. Error:`, fallbackErr.message);
              }
            }
            throw err; // If all else fails, propagate the original error
          }
        }
      };
    }
  };
}

const flashModel = createFallbackModel("gemini-3.1-flash-lite", [
  "gemini-2.5-flash-lite", 
  "gemini-3-flash", 
  "gemini-2.5-flash"
]);

const proModel = createFallbackModel("gemini-3.5-flash", [
  "gemini-3-flash", 
  "gemini-2.5-flash", 
  "gemini-3.1-flash-lite"
]);

function parseGeminiJSON(responseText) {
  if (!responseText) return null;
  try {
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Failed to parse Gemini response as JSON:', error);
    return null;
  }
}

module.exports = {
  flashModel,
  proModel,
  parseGeminiJSON
};
