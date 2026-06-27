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
    case 'damaged_footpath':
      return 'District Collector (Roads Division) / Municipal Commissioner';
    case 'water_leak':
    case 'flooding':
    case 'open_drain':
      return 'Chief Engineer, Water Supply / Municipal Commissioner';
    case 'streetlight':
      return 'Superintending Engineer, Electrical / Chief Electrical Officer';
    case 'waste':
    case 'garbage_burning':
      return 'Health Officer / Chief Sanitary Inspector';
    default:
      return 'Municipal Commissioner';
  }
}

// Determine escalation level based on hours overdue
function getEscalationLevel(hoursOverdue) {
  if (hoursOverdue >= 168) return { level: 3, name: 'Media/NGO Alert Template Generated', tone: 'administrative_failure' };
  if (hoursOverdue >= 72)  return { level: 2, name: 'RTI Application Drafted', tone: 'severe' };
  return { level: 1, name: 'Formal Complaint Drafted', tone: 'firm' };
}

async function runEscalator() {
  const log = [];
  const now = new Date();
  
  try {
    // Fetch all open (non-resolved, non-duplicate) issues
    const snapshot = await db.collection('issues')
      .where('status', 'in', ['reported', 'in_progress', 'escalated'])
      .get();
    
    let issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Filter out duplicate issues in memory
    issues = issues.filter(issue => !issue.duplicate_of);
    
    log.push(`Fetched ${issues.length} open issues`);

    // --- DEDUPLICATION PASS ---
    const processedIds = new Set();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    // Only deduplicate recent issues to avoid O(N^2) explosion
    const recentIssues = issues.filter(issue => getCreatedAt(issue) >= fortyEightHoursAgo);
    
    for (let i = 0; i < recentIssues.length; i++) {
      if (processedIds.has(recentIssues[i].id)) continue;
      
      for (let j = i + 1; j < recentIssues.length; j++) {
        if (processedIds.has(recentIssues[j].id)) continue;
        
        const catI = recentIssues[i].analysis?.category || recentIssues[i].category;
        const catJ = recentIssues[j].analysis?.category || recentIssues[j].category;
        if (!catI || !catJ || catI !== catJ) continue;
        
        if (!recentIssues[i].location || !recentIssues[j].location) continue;
        
        const dist = haversineDistance(
          recentIssues[i].location.lat, recentIssues[i].location.lng,
          recentIssues[j].location.lat, recentIssues[j].location.lng
        );
        
        if (dist <= 100) { // Within 100 meters
          const dateI = getCreatedAt(recentIssues[i]);
          const dateJ = getCreatedAt(recentIssues[j]);
          
          const original = dateI <= dateJ ? recentIssues[i] : recentIssues[j];
          const duplicate = original.id === recentIssues[i].id ? recentIssues[j] : recentIssues[i];
          
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
      if (processedIds.has(issue.id)) continue;
      
      const createdAt = getCreatedAt(issue);
      const slaHours = issue.routing?.sla_deadline_hours || issue.sla_deadline_hours || 72;
      
      let slaDeadline;
      if (issue.sla_deadline_timestamp) {
        slaDeadline = new Date(issue.sla_deadline_timestamp);
      } else {
        slaDeadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
      }
      
      if (now > slaDeadline) {
        const hoursOverdue = Math.round((now - slaDeadline) / (1000 * 60 * 60));
        const escalation = getEscalationLevel(hoursOverdue);
        
        // Only re-escalate if level has increased since last escalation
        const currentEscalationLevel = issue.escalation_level || 0;
        if (escalation.level <= currentEscalationLevel && issue.status === 'escalated') {
          continue; // Already at this level or higher
        }
        
        const category = issue.analysis?.category || issue.category || 'other';
        const department = issue.routing?.assigned_agency || issue.analysis?.suggested_department || issue.department || 'Municipal Corporation';
        const escalationAuthority = issue.routing?.escalation_authority || getEscalationAuthority(category);
        
        const preparedIssue = {
          category,
          location: issue.location || { address: 'unknown location' },
          ai_description: issue.analysis?.ai_description || issue.ai_description || 'Civic infrastructure defect',
          department,
          sla_deadline_hours: slaHours,
          escalation_authority: escalationAuthority,
          escalation_level: escalation.level,
          escalation_level_name: escalation.name,
          escalation_tone: escalation.tone,
          id: issue.id
        };
        
        const escalationNotice = await generateEscalationNotice(preparedIssue, hoursOverdue);
        
        await db.collection('issues').doc(issue.id).update({
          status: 'escalated',
          escalation_count: FieldValue.increment(1),
          escalation_level: escalation.level,
          escalation_level_name: escalation.name,
          escalation_notice: escalationNotice,
          updatedAt: FieldValue.serverTimestamp()
        });
        
        log.push(`Escalated issue ${issue.id} to Level ${escalation.level} (${escalation.name}): ${hoursOverdue}h overdue (${category})`);
      }
    }

    return { success: true, log, timestamp: now.toISOString() };
  } catch (error) {
    console.error('Escalator error:', error);
    return { success: false, error: error.message, log };
  }
}

async function generateEscalationNotice(issue, hoursOverdue) {
  const toneInstructions = {
    firm: 'Write in a firm, public-facing tone outlining a formal complaint for the citizen to copy and send.',
    severe: 'Write in a STRONGLY WORDED tone formatting an RTI (Right to Information) query draft regarding this unresolved issue.',
    administrative_failure: 'Write a grave, formal press release / NGO alert template that the citizen can forward to local media.'
  };

  const prompt = `You are an AI civic advocate drafting a public escalation notice.

Issue: ${issue.category} at ${issue.location.address || 'unknown location'}
Description: ${issue.ai_description}
Department Responsible: ${issue.department}
SLA Was: ${issue.sla_deadline_hours} hours
Hours Overdue: ${hoursOverdue} hours (${Math.round(hoursOverdue / 24)} days overdue)
Escalation Level: Level ${issue.escalation_level} — Escalated to ${issue.escalation_level_name}
Escalation Authority: ${issue.escalation_authority}

${toneInstructions[issue.escalation_tone] || toneInstructions.firm}

Include:
1. The exact number of hours overdue
2. Reference to SLA Section 8.1 breach
3. The specific consequence if not resolved in the next 24 hours
4. The authority this is being escalated to

Write 3-4 sentences maximum. No JSON. No markdown. Professional, formal prose.`;

  try {
    const result = await flashModel.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Gemini escalation notice generation failed:', error);
    return `ESCALATION NOTICE (Level ${issue.escalation_level}): Issue #${issue.id} is ${hoursOverdue} hours past its SLA deadline. This matter has been escalated to ${issue.escalation_level_name} (${issue.escalation_authority}) as per SLA Section 8.1. Immediate remediation is required within 24 hours to avoid further administrative action.`;
  }
}

module.exports = { runEscalator };
