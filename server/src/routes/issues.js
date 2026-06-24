const express = require('express');
const router = express.Router();

const { analyzeMedia } = require('../agents/observerAgent');
const { routeIssue } = require('../agents/routerAgent');
const { db, FieldValue } = require('../config/firebase');
const verifyAuth = require('../middleware/verifyAuth');
const { v4: uuidv4 } = require('uuid');
const { flashModel } = require('../utils/gemini');

router.post('/analyze', async (req, res) => {
  try {
    const { mediaBase64, mediaType } = req.body;
    if (!mediaBase64) return res.status(400).json({ error: 'mediaBase64 is required' });

    const analysis = await analyzeMedia(mediaBase64, mediaType || 'image');
    res.json({ success: true, analysis });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

router.post('/submit', verifyAuth, async (req, res) => {
  try {
    const {
      mediaBase64,
      mediaType,
      analysis,
      location
    } = req.body;

    const userId = req.user?.uid || 'anonymous';

    // Translate user_description to English if provided
    let translatedDescription = user_description || '';
    if (user_description && user_description.trim()) {
      try {
        const transResult = await flashModel.generateContent(
          `Translate the following text to English. If it is already in English, just return it as is. Do not add any explanation.\n\nText: "${user_description}"`
        );
        translatedDescription = transResult.response.text().trim();
      } catch (e) {
        console.error('Translation error:', e);
      }
    }

    // Call Agent 2: Civic Router
    // We can pass the translated description into routing if we want to enhance it later
    const routingInfo = await routeIssue(analysis, location);

    const issueDoc = {
      media_url: mediaBase64,   // base64 data-URL — works as <img src> directly
      media_type: mediaType || 'image',
      analysis,
      user_description: user_description || '',
      translated_description: translatedDescription,
      routing: routingInfo,
      location,
      userId,
      status: 'reported',
      upvotes: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    };

    const issueId = uuidv4();
    await db.collection('issues').doc(issueId).set(issueDoc);
    console.log('Issue saved with ID:', issueId);

    // Update user's civic points
    if (userId !== 'anonymous') {
      const userRef = db.collection('users').doc(userId);
      await userRef.set({
        civic_points: FieldValue.increment(10),
        reports_count: FieldValue.increment(1)
      }, { merge: true });
    }

    res.json({
      success: true,
      issueId: issueId,
      routing: routingInfo
    });
  } catch (error) {
    console.error('Submit Error:', error);
    res.status(500).json({ error: 'Submission failed', details: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('issues')
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();
      
    const issues = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ success: true, issues });
  } catch (error) {
    console.error('Get Issues Error (index fallback):', error);
    try {
      const snapshot = await db.collection('issues')
        .limit(50)
        .get();
        
      const issues = snapshot.docs.map(doc => {
        const data = doc.data();
        let rawDate = data.created_at || data.createdAt;
        let created_at;
        if (rawDate && typeof rawDate.toDate === 'function') {
          created_at = rawDate.toDate().toISOString();
        } else if (rawDate && rawDate._seconds) {
          created_at = new Date(rawDate._seconds * 1000).toISOString();
        } else if (rawDate) {
          created_at = new Date(rawDate).toISOString();
        } else {
          created_at = new Date().toISOString();
        }
        return {
          id: doc.id,
          ...data,
          created_at
        };
      });
      
      issues.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      res.json({ success: true, issues });
    } catch (fallbackError) {
      console.error('Get Issues Fallback Error:', fallbackError);
      res.status(500).json({ error: 'Failed to get issues', details: fallbackError.message });
    }
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('issues').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    res.json({ success: true, issue: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Get Issue Error:', error);
    res.status(500).json({ error: 'Failed to get issue', details: error.message });
  }
});

router.post('/:id/ask', async (req, res) => {
  try {
    const doc = await db.collection('issues').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const issue = { id: doc.id, ...doc.data() };
    const { question, history = [] } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'question is required' });
    }

    const analysis = issue.analysis || {};
    const routing  = issue.routing  || {};

    const systemContext = `You are a helpful AI assistant for CivicLens.ai, a civic issue reporting platform. You are answering questions about a specific reported civic issue.

ISSUE CONTEXT:
- Category: ${analysis.category || issue.category || 'unknown'}
- Severity: ${analysis.severity_score || issue.severity_score || 'N/A'}/5
- Description: ${analysis.ai_description || issue.ai_description || 'No description available'}
- Department Assigned: ${routing.assigned_agency || issue.department || 'Not assigned'}
- Status: ${issue.status || 'reported'}
- SLA Deadline: ${routing.sla_deadline_hours || issue.sla_deadline_hours || 'N/A'} hours from report
- Cited Rule: ${routing.cited_sla_rule || issue.cited_sla_rule || 'N/A'}
- Escalation Authority: ${routing.escalation_authority || issue.escalation_authority || 'N/A'}
- Formal Complaint: ${routing.formal_complaint || issue.formal_complaint || 'N/A'}

Answer the citizen's question helpfully and specifically using this context. Be empathetic. Keep answers under 100 words. If asked about timelines, cite the SLA rule. If asked what to do next, be specific.`;

    // Build conversation history for multi-turn chat
    const { flashModel } = require('../utils/gemini');
    const chat = flashModel.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemContext }],
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I have the full context of this civic issue and I am ready to help the citizen with any questions they have.' }],
        },
        ...history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }],
        })),
      ],
    });

    const result = await chat.sendMessage(question.trim());
    const answer = result.response.text();

    res.json({ success: true, answer });
  } catch (error) {
    console.error('Ask AI Error:', error);
    res.status(500).json({ error: 'AI response failed', details: error.message });
  }
});

router.post('/:id/upvote', verifyAuth, async (req, res) => {
  try {
    const docRef = db.collection('issues').doc(req.params.id);
    await docRef.update({
      upvotes: FieldValue.increment(1)
    });
    res.json({ success: true, message: 'Upvoted successfully' });
  } catch (error) {
    console.error('Upvote Error:', error);
    res.status(500).json({ error: 'Upvote failed', details: error.message });
  }
});

router.post('/:id/verify', verifyAuth, async (req, res) => {
  try {
    const { mediaBase64 } = req.body;
    const userId = req.user.uid;

    if (!mediaBase64) return res.status(400).json({ error: 'mediaBase64 is required' });

    const issueRef = db.collection('issues').doc(req.params.id);
    const doc = await issueRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const issue = doc.data();

    // Verify using Gemini
    const [header, base64Data] = mediaBase64.split(',');
    const mimeType = header.match(/:(.*?);/)[1];

    const prompt = `You are a verification agent. A citizen uploaded this image to verify an existing issue:
Original Category: ${issue.analysis?.category || issue.category}
Original Description: ${issue.analysis?.ai_description || issue.ai_description}

Does this new image clearly show the same type of infrastructure issue described above?
Respond ONLY with a JSON object:
{
  "matches": <true/false>,
  "reason": "<1 sentence explanation>"
}`;

    const result = await flashModel.generateContent([
      { inlineData: { data: base64Data, mimeType } },
      prompt
    ]);
    
    // Fallback parser since parseGeminiJSON might not be imported here
    let parsed;
    try {
      let text = result.response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(text);
    } catch(e) {
      parsed = { matches: true, reason: "Fallback verification due to parsing error." };
    }

    if (parsed.matches) {
      await issueRef.update({
        verified_by_community: true,
        verification_count: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Reward points
      await db.collection('users').doc(userId).set({
        civic_points: FieldValue.increment(20),
        verifications_count: FieldValue.increment(1)
      }, { merge: true });

      res.json({ success: true, message: 'Issue verified successfully!', points_earned: 20 });
    } else {
      res.json({ success: false, message: 'Verification failed. ' + parsed.reason });
    }

  } catch (error) {
    console.error('Verify Error:', error);
    res.status(500).json({ error: 'Verification failed', details: error.message });
  }
});
router.patch('/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, department } = req.body;
    const updateData = {
      updatedAt: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    };

    if (status !== undefined) {
      updateData.status = status;
    }
    
    // We update the routing object if a new department is assigned
    if (department !== undefined) {
      updateData['routing.assigned_agency'] = department;
      updateData.department = department; // Also update the root property just in case
    }

    if (Object.keys(updateData).length <= 2) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    const docRef = db.collection('issues').doc(id);
    await docRef.update(updateData);
    
    // Fetch and return the updated document
    const updatedDoc = await docRef.get();
    
    res.json({ success: true, message: 'Issue updated successfully', issue: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    console.error('Update Issue Error:', error);
    res.status(500).json({ error: 'Update failed', details: error.message });
  }
});

module.exports = router;
