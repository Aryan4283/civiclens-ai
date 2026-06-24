const { db, FieldValue } = require('../config/firebase');
const { haversineDistance } = require('../utils/haversine');
const { flashModel } = require('../utils/gemini');

// Helper to get creation date
const getCreatedAt = (issue) => {
  if (issue.createdAt && typeof issue.createdAt.toDate === 'function') {
    return issue.createdAt.toDate();
  }
  if (issue.createdAt) return new Date(issue.createdAt);
  if (issue.created_at) return new Date(issue.created_at);
  return new Date();
};

// Helper to map category to Escalation Authority
function getEscalationAuthority(category) {
  switch (category) {
    case 'pothole':
    case 'road_damage':
      return 'District Collector (Roads Division) / Municipal Commissioner';
    case 'water_leak':
    case 'flooding':
      return 'Chief Engineer, Water Supply / Municipal Commissioner';
    case 'streetlight':
      return 'Superintending Engineer, Electrical / Chief Electrical Officer';
    case 'waste':
      return 'Health Officer / Chief Sanitary Inspector';
    default:
      return 'Municipal Commissioner';
  }
}

async function runEscalator() {
  const log = [];
  const now = new Date();
  
  try {
    // Fetch all open (non-resolved, non-duplicate) issues
    // Using memory-filtering for duplicate_of since undefined fields aren't indexed for direct query.
    const snapshot = await db.collection('issues')
      .where('status', 'in', ['reported', 'in_progress', 'escalated'])
      .get();
    
    let issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Filter out duplicate issues in memory
    issues = issues.filter(issue => !issue.duplicate_of);
    
    log.push(`Fetched ${issues.length} open issues`);

    // --- DEDUPLICATION PASS ---
    const processedIds = new Set();
    
    for (let i = 0; i < issues.length; i++) {
      if (processedIds.has(issues[i].id)) continue;
      
      for (let j = i + 1; j < issues.length; j++) {
        if (processedIds.has(issues[j].id)) continue;
        
        // Extract categories (handling flat and nested representation)
        const catI = issues[i].analysis?.category || issues[i].category;
        const catJ = issues[j].analysis?.category || issues[j].category;
        if (!catI || !catJ || catI !== catJ) continue;
        
        // Ensure they have valid locations
        if (!issues[i].location || !issues[j].location) continue;
        
        const dist = haversineDistance(
          issues[i].location.lat, issues[i].location.lng,
          issues[j].location.lat, issues[j].location.lng
        );
        
        if (dist <= 100) { // Within 100 meters
          const dateI = getCreatedAt(issues[i]);
          const dateJ = getCreatedAt(issues[j]);
          
          // Mark newer issue as duplicate of older one
          const original = dateI <= dateJ ? issues[i] : issues[j];
          const duplicate = original.id === issues[i].id ? issues[j] : issues[i];
          
          await db.collection('issues').doc(duplicate.id).update({
            status: 'duplicate',
            duplicate_of: original.id,
            updatedAt: FieldValue.serverTimestamp()
          });
          
          // Boost upvotes on original
          await db.collection('issues').doc(original.id).update({
            upvotes: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp()
          });
          
          processedIds.add(duplicate.id);
          log.push(`Merged duplicate: ${duplicate.id} → ${original.id} (${Math.round(dist)}m apart)`);
        }
      }
    }

    // --- ESCALATION PASS ---
    for (const issue of issues) {
      if (processedIds.has(issue.id)) continue; // Skip duplicates
      
      const createdAt = getCreatedAt(issue);
      const slaHours = issue.routing?.sla_deadline_hours || issue.sla_deadline_hours || 72;
      
      // Calculate SLA deadline
      let slaDeadline;
      if (issue.sla_deadline_timestamp) {
        slaDeadline = new Date(issue.sla_deadline_timestamp);
      } else {
        slaDeadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
      }
      
      if (now > slaDeadline && issue.status !== 'escalated') {
        const hoursOverdue = Math.round((now - slaDeadline) / (1000 * 60 * 60));
        
        // Prepare/resolve properties for Gemini escalation notice
        const category = issue.analysis?.category || issue.category || 'other';
        const department = issue.routing?.assigned_agency || issue.analysis?.suggested_department || issue.department || 'Municipal Corporation';
        const escalationAuthority = getEscalationAuthority(category);
        
        const preparedIssue = {
          category,
          location: issue.location || { address: 'unknown location' },
          ai_description: issue.analysis?.ai_description || issue.ai_description || 'Civic infrastructure defect',
          department,
          sla_deadline_hours: slaHours,
          escalation_authority: escalationAuthority,
          id: issue.id
        };
        
        // Generate escalation notice
        const escalationNotice = await generateEscalationNotice(preparedIssue, hoursOverdue);
        
        await db.collection('issues').doc(issue.id).update({
          status: 'escalated',
          escalation_count: FieldValue.increment(1),
          escalation_notice: escalationNotice,
          updatedAt: FieldValue.serverTimestamp()
        });
        
        log.push(`Escalated issue ${issue.id}: ${hoursOverdue}h overdue (${category})`);
      }
    }

    return { success: true, log, timestamp: now.toISOString() };
  } catch (error) {
    console.error('Escalator error:', error);
    return { success: false, error: error.message, log };
  }
}

async function generateEscalationNotice(issue, hoursOverdue) {
  const prompt = `Generate a short (3-4 sentence) formal escalation notice for a civic complaint that is overdue.

Issue: ${issue.category} at ${issue.location.address || 'unknown location'}
Description: ${issue.ai_description}
Department Responsible: ${issue.department}
SLA Was: ${issue.sla_deadline_hours} hours
Hours Overdue: ${hoursOverdue}
Escalation Authority: ${issue.escalation_authority}

Respond with ONLY the escalation notice text. No JSON. Professional tone.`;

  try {
    const result = await flashModel.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Gemini escalation notice generation failed:', error);
    return `ESCALATION NOTICE: Issue #${issue.id} is ${hoursOverdue} hours past its SLA deadline. Immediate action required by ${issue.department}. Escalated to ${issue.escalation_authority}.`;
  }
}

module.exports = { runEscalator };
