const { db, FieldValue } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');

// Utility to calculate date offsets
function getPastDate(hoursAgo) {
  const date = new Date();
  date.setMilliseconds(0);
  date.setSeconds(0);
  date.setTime(date.getTime() - hoursAgo * 60 * 60 * 1000);
  return date;
}

const users = [
  { userId: 'user_01_rahul', userName: 'Rahul Sharma', points: 120 },
  { userId: 'user_02_priya', userName: 'Priya Patel', points: 80 },
  { userId: 'user_03_amit', userName: 'Amit Singh', points: 150 },
  { userId: 'user_04_neha', userName: 'Neha Gupta', points: 40 },
  { userId: 'user_05_vikram', userName: 'Vikram Mehta', points: 90 },
  { userId: 'user_06_ananya', userName: 'Ananya Sen', points: 210 },
  { userId: 'user_07_sanjay', userName: 'Sanjay Rao', points: 60 },
  { userId: 'user_08_deepa', userName: 'Deepa Nair', points: 110 }
];

const issueTemplates = [
  // 1. Pothole (reported)
  {
    category: 'pothole',
    status: 'reported',
    lat: 22.7230,
    lng: 75.8810,
    address: 'Palasia Main Rd, Near Chappan Dukan, Indore, Madhya Pradesh 452001',
    severity_score: 3,
    ai_description: 'A moderate-sized pothole, approximately 20 cm in diameter and 6 cm deep, is visible in the middle of the left lane. It poses a minor hazard to two-wheelers and could cause swerving in heavy traffic.',
    suggested_department: 'PWD',
    assigned_agency: 'Public Works Department (PWD)',
    sla_tier: 'Class B — Moderate Defects',
    sla_deadline_hours: 168,
    cited_sla_rule: 'Section 3.1(b) — Class B defects on secondary and residential roads must be addressed within 7 days.',
    formal_complaint: 'A pothole has formed on Palasia Main Road, causing vehicles, especially two-wheelers, to swerve unexpectedly. Pursuant to Section 3.1(b) of the Municipal Service Level Agreement, this Class B defect must be resolved within 7 calendar days of reporting. Immediate patch repair is requested to ensure public safety.',
    escalation_authority: 'District Collector (Roads Division) / Municipal Commissioner',
    escalation_contact: 'collector-indore@mp.gov.in',
    upvotes: 4,
    hoursAgoCreated: 2,
    hoursAgoUpdated: 2,
    userId: 'user_01_rahul'
  },
  // 2. Pothole (in_progress)
  {
    category: 'pothole',
    status: 'in_progress',
    lat: 22.7510,
    lng: 75.8920,
    address: 'Vijay Nagar Square, Near C21 Mall, Indore, Madhya Pradesh 452010',
    severity_score: 4,
    ai_description: 'A large pothole exceeding 35 cm in diameter and 12 cm in depth on a high-traffic highway lane. Steel reinforcement bars from the sub-base are starting to become exposed, presenting a severe risk for tire blowouts.',
    suggested_department: 'PWD',
    assigned_agency: 'Public Works Department (PWD)',
    sla_tier: 'Class A — Critical Defects',
    sla_deadline_hours: 72,
    cited_sla_rule: 'Section 3.1(a) — Class A road defects must be permanently repaired within 72 hours.',
    formal_complaint: 'A highly dangerous and deep pothole is active near Vijay Nagar Square on the primary arterial road. This constitutes a Class A Critical Defect under Section 3.1(a) of the Municipal SLA, carrying a mandatory 72-hour resolution deadline. We demand immediate cordoning and permanent resurfacing of this lane.',
    escalation_authority: 'District Collector (Roads Division) / Municipal Commissioner',
    escalation_contact: 'collector-indore@mp.gov.in',
    upvotes: 18,
    hoursAgoCreated: 48,
    hoursAgoUpdated: 24,
    userId: 'user_02_priya'
  },
  // 3. Pothole (escalated)
  {
    category: 'pothole',
    status: 'escalated',
    lat: 22.7180,
    lng: 75.8540,
    address: 'Rajwada Palace Market Road, Indore, Madhya Pradesh 452002',
    severity_score: 5,
    ai_description: 'Extremely deep pothole/sinkhole exceeding 50 cm width and 15 cm depth on a major commercial street. Foot traffic is heavy, and pedestrians are at risk of falling, especially at night due to poor lighting.',
    suggested_department: 'PWD',
    assigned_agency: 'Public Works Department (PWD)',
    sla_tier: 'Class A — Critical Defects',
    sla_deadline_hours: 72,
    cited_sla_rule: 'Section 3.1(a) — Class A road defects must be permanently repaired within 72 hours.',
    formal_complaint: 'A hazardous crater is present in the bustling Rajwada Market area. As a Class A defect under Section 3.1(a), it requires barricading within 6 hours and resolution within 72 hours. This period has expired, and the issue remains unresolved, creating a severe public safety emergency.',
    escalation_authority: 'District Collector (Roads Division) / Municipal Commissioner',
    escalation_contact: 'collector-indore@mp.gov.in',
    upvotes: 23,
    hoursAgoCreated: 120, // 5 days ago
    hoursAgoUpdated: 24,
    userId: 'user_03_amit',
    escalation_notice: 'ESCALATION NOTICE: Issue is 48 hours past its SLA deadline. Immediate action is required by the Public Works Department (PWD). The matter has been escalated to the Municipal Commissioner.',
    hoursAgoEscalated: 24
  },
  // 4. Pothole (resolved)
  {
    category: 'pothole',
    status: 'resolved',
    lat: 22.6920,
    lng: 75.8650,
    address: 'Bhanwarkuan Square, Near DAVV Campus, Indore, Madhya Pradesh 452001',
    severity_score: 2,
    ai_description: 'A cluster of shallow surface depressions and minor cracks on a residential street. No immediate safety hazard, but water is beginning to pool inside them.',
    suggested_department: 'PWD',
    assigned_agency: 'Public Works Department (PWD)',
    sla_tier: 'Class C — Minor Defects',
    sla_deadline_hours: 720,
    cited_sla_rule: 'Section 3.1(c) — Minor road defects are to be included in the next scheduled maintenance cycle, not exceeding 30 days.',
    formal_complaint: 'Surface wear and minor potholes are developing near Bhanwarkuan residential lanes. Under Section 3.1(c), these minor defects must be patched during the current monthly cycle. We request scheduled maintenance before monsoon rains worsen the sub-base.',
    escalation_authority: 'District Collector (Roads Division) / Municipal Commissioner',
    escalation_contact: 'collector-indore@mp.gov.in',
    upvotes: 2,
    hoursAgoCreated: 144, // 6 days ago
    hoursAgoUpdated: 96,
    userId: 'user_04_neha'
  },
  // 5. Water Leak (reported)
  {
    category: 'water_leak',
    status: 'reported',
    lat: 22.7210,
    lng: 75.8850,
    address: 'Geeta Bhawan Temple Road, Indore, Madhya Pradesh 452001',
    severity_score: 4,
    ai_description: 'An active pipeline rupture under the footpath is causing clean drinking water to shoot up and pool onto the road. The surrounding soil is eroding, threatening to compromise the footpath structure.',
    suggested_department: 'Water Board',
    assigned_agency: 'Municipal Water Supply Board',
    sla_tier: 'Active Water Leakage (Burst Pipes)',
    sla_deadline_hours: 24,
    cited_sla_rule: 'Section 4.1(a) — Active water leakages from supply mains constitute a Priority 1 emergency and must be resolved within 24 hours.',
    formal_complaint: 'A major water main has burst on Geeta Bhawan Road, flooding the street and wasting thousands of liters of clean water. Section 4.1(a) mandates a 24-hour response and resolution for burst pipes. Immediate crew dispatch is requested to shut off the valve and replace the pipe section.',
    escalation_authority: 'Chief Engineer, Water Supply / Municipal Commissioner',
    escalation_contact: 'water-commissioner@indore.gov.in',
    upvotes: 9,
    hoursAgoCreated: 6,
    hoursAgoUpdated: 6,
    userId: 'user_05_vikram'
  },
  // 6. Water Leak (in_progress)
  {
    category: 'water_leak',
    status: 'in_progress',
    lat: 22.7010,
    lng: 75.8340,
    address: 'Annapurna Temple Road, Near Krishi Mandi, Indore, Madhya Pradesh 452009',
    severity_score: 3,
    ai_description: 'Steady water seepage from an underground joint is continuously dampening the road surface, causing algae growth. Although not spraying water, it is a constant leak.',
    suggested_department: 'Water Board',
    assigned_agency: 'Municipal Water Supply Board',
    sla_tier: 'Minor Leakage (Seepage, Dripping)',
    sla_deadline_hours: 72,
    cited_sla_rule: 'Section 4.1(b) — Minor seepage and slow leaks must be repaired within 72 hours to prevent escalation.',
    formal_complaint: 'Underground pipeline seepage is observed on Annapurna Road, causing slippery road conditions due to constant dampness. In accordance with Section 4.1(b), this minor leak must be repaired within 72 hours. Repair work should be completed to conserve water and prevent tarmac damage.',
    escalation_authority: 'Chief Engineer, Water Supply / Municipal Commissioner',
    escalation_contact: 'water-commissioner@indore.gov.in',
    upvotes: 3,
    hoursAgoCreated: 24,
    hoursAgoUpdated: 12,
    userId: 'user_06_ananya'
  },
  // 7. Water Leak (escalated)
  {
    category: 'water_leak',
    status: 'escalated',
    lat: 22.7380,
    lng: 75.9010,
    address: 'Khajrana Ganesh Temple Road, Indore, Madhya Pradesh 452016',
    severity_score: 5,
    ai_description: 'A ruptured distribution line has completely cut off water supply to the residential block and is flooding neighboring basements. Water logging is about 1 foot deep in low-lying properties.',
    suggested_department: 'Water Board',
    assigned_agency: 'Municipal Water Supply Board',
    sla_tier: 'Active Water Leakage (Burst Pipes)',
    sla_deadline_hours: 24,
    cited_sla_rule: 'Section 4.1(a) — Active water leakages from supply mains or distribution pipes constitute a Priority 1 emergency and must be resolved within 24 hours.',
    formal_complaint: 'A critical supply pipe has broken near Khajrana, causing severe flooding in basement properties and a complete local outage. This Priority 1 emergency should have been resolved within 24 hours under Section 4.1(a). The SLA deadline has passed, and we demand immediate emergency action and water tanker deployment.',
    escalation_authority: 'Chief Engineer, Water Supply / Municipal Commissioner',
    escalation_contact: 'water-commissioner@indore.gov.in',
    upvotes: 21,
    hoursAgoCreated: 72, // 3 days ago
    hoursAgoUpdated: 24,
    userId: 'user_07_sanjay',
    escalation_notice: 'ESCALATION NOTICE: Active water leakage remains unresolved 48 hours past its 24-hour SLA deadline. Escalated to Chief Engineer, Water Supply. Written explanation is required.',
    hoursAgoEscalated: 24
  },
  // 8. Streetlight (reported)
  {
    category: 'streetlight',
    status: 'reported',
    lat: 22.7310,
    lng: 75.8890,
    address: 'Saket Nagar Main Club Road, Indore, Madhya Pradesh 452018',
    severity_score: 3,
    ai_description: 'A single street light pole is completely dark, causing a dark zone of approximately 20 meters on a residential road. The pole itself looks undamaged, suggesting bulb or circuit failure.',
    suggested_department: 'Electricity Department',
    assigned_agency: 'Municipal Electricity Department',
    sla_tier: 'Single Street Light Failure',
    sla_deadline_hours: 72,
    cited_sla_rule: 'Section 5.1(a) — Individual street light failures must be repaired within 72 hours of reporting.',
    formal_complaint: 'A streetlight pole has stopped functioning on Saket Nagar Road, leaving a dark corridor. Section 5.1(a) mandates repair of individual light failures within 72 hours. We request replacement of the faulty bulb to restore security on this residential lane.',
    escalation_authority: 'Superintending Engineer, Electrical / Chief Electrical Officer',
    escalation_contact: 'elec-officer@indore.gov.in',
    upvotes: 1,
    hoursAgoCreated: 12,
    hoursAgoUpdated: 12,
    userId: 'user_08_deepa'
  },
  // 9. Streetlight (in_progress)
  {
    category: 'streetlight',
    status: 'in_progress',
    lat: 22.7160,
    lng: 75.8510,
    address: 'Sarafa Bazar, Near Night Market, Indore, Madhya Pradesh 452002',
    severity_score: 4,
    ai_description: 'A stretch of 4 consecutive streetlights are out, throwing a busy commercial market path into absolute darkness. This creates significant safety risks for shoppers and increased vulnerability to theft.',
    suggested_department: 'Electricity Department',
    assigned_agency: 'Municipal Electricity Department',
    sla_tier: 'Multiple Street Light Failure',
    sla_deadline_hours: 48,
    cited_sla_rule: 'Section 5.1(b) — Multiple street light failure on any road stretch is classified as Priority 2 and must be repaired within 48 hours.',
    formal_complaint: 'Multiple streetlights (4 units) are non-functional in Sarafa Bazar. This represents a serious hazard in a high-density night market. Under Section 5.1(b), this Priority 2 multiple failure must be resolved within 48 hours. A repair team needs to inspect the local feeder box immediately.',
    escalation_authority: 'Superintending Engineer, Electrical / Chief Electrical Officer',
    escalation_contact: 'elec-officer@indore.gov.in',
    upvotes: 12,
    hoursAgoCreated: 72, // 3 days ago
    hoursAgoUpdated: 24,
    userId: 'user_01_rahul'
  },
  // 10. Streetlight (escalated)
  {
    category: 'streetlight',
    status: 'escalated',
    lat: 22.7430,
    lng: 75.8860,
    address: 'LIG Link Road, Near LIG Square Flyover, Indore, Madhya Pradesh 452008',
    severity_score: 5,
    ai_description: 'All streetlights on a high-traffic highway corridor are out over a 200-meter stretch. Poor visibility at high speeds is creating an extremely high collision risk.',
    suggested_department: 'Electricity Department',
    assigned_agency: 'Municipal Electricity Department',
    sla_tier: 'Main Road / Highway Lighting Failure',
    sla_deadline_hours: 24,
    cited_sla_rule: 'Section 5.1(c) — Street lighting failure on high-traffic corridors must be treated as Priority 1 with 24-hour resolution mandate.',
    formal_complaint: 'A major lighting outage is active on LIG Link Road, affecting the entire overpass stretch. Section 5.1(c) classifies this as a Priority 1 safety emergency, requiring full restoration within 24 hours. The deadline has passed, leaving a major speed corridor completely unlit.',
    escalation_authority: 'Superintending Engineer, Electrical / Chief Electrical Officer',
    escalation_contact: 'elec-officer@indore.gov.in',
    upvotes: 20,
    hoursAgoCreated: 144, // 6 days ago
    hoursAgoUpdated: 24,
    userId: 'user_02_priya',
    escalation_notice: 'ESCALATION NOTICE: Major highway lighting failure remains unresolved. Reached Level 2 escalation status under Section 8.1(b). Escalated to Chief Electrical Officer.',
    hoursAgoEscalated: 24
  },
  // 11. Waste (reported)
  {
    category: 'waste',
    status: 'reported',
    lat: 22.7290,
    lng: 75.9080,
    address: 'Bengali Square Main Crossing, Indore, Madhya Pradesh 452016',
    severity_score: 3,
    ai_description: 'Large accumulation of household plastic waste and organic refuse dumped on the public road divider. Stray dogs are scattering the garbage, blocking part of the traffic lane.',
    suggested_department: 'Municipal Sanitation',
    assigned_agency: 'Municipal Sanitation Department',
    sla_tier: 'Illegal Dumping / Large Garbage Accumulation',
    sla_deadline_hours: 48,
    cited_sla_rule: 'Section 6.1(b) — Illegal dumping sites and large accumulations of solid waste in public areas must be cleared within 48 hours.',
    formal_complaint: 'An illegal garbage dumping pile has formed at Bengali Square. Section 6.1(b) mandates clearance of large garbage accumulations within 48 hours. The rotting waste is creating public health risks and a traffic hazard.',
    escalation_authority: 'Health Officer / Chief Sanitary Inspector',
    escalation_contact: 'sanitation-officer@indore.gov.in',
    upvotes: 5,
    hoursAgoCreated: 4,
    hoursAgoUpdated: 4,
    userId: 'user_03_amit'
  },
  // 12. Waste (resolved)
  {
    category: 'waste',
    status: 'resolved',
    lat: 22.7270,
    lng: 75.8640,
    address: 'Snehlataganj Commercial Complex, Indore, Madhya Pradesh 452003',
    severity_score: 3,
    ai_description: 'A large public metal garbage bin is overflowing with market refuse, spilling onto the adjacent footpath and creating an intense foul odor.',
    suggested_department: 'Municipal Sanitation',
    assigned_agency: 'Municipal Sanitation Department',
    sla_tier: 'Overflowing Public Bins',
    sla_deadline_hours: 12,
    cited_sla_rule: 'Section 6.1(c) — Overflowing public garbage bins must be emptied within 12 hours of report.',
    formal_complaint: 'The community dumpster at Snehlataganj is overflowing severely, blocking pedestrian access. Under Section 6.1(c), the sanitation department must clear this within 12 hours. We request immediate cleanup of the spilled waste.',
    escalation_authority: 'Health Officer / Chief Sanitary Inspector',
    escalation_contact: 'sanitation-officer@indore.gov.in',
    upvotes: 0,
    hoursAgoCreated: 192, // 8 days ago
    hoursAgoUpdated: 187,
    userId: 'user_04_neha'
  },
  // 13. Flooding (reported)
  {
    category: 'flooding',
    status: 'reported',
    lat: 22.7090,
    lng: 75.8980,
    address: 'Pipliyahana Lake Road, Near Pipliyahana Square, Indore, Madhya Pradesh 452016',
    severity_score: 4,
    ai_description: 'Severe storm water logging on the road due to completely choked catch basins. Water depth is around 8 inches, causing vehicles to stall and forcing traffic into a single file.',
    suggested_department: 'Municipal Corporation',
    assigned_agency: 'Municipal Storm Water Drainage Department',
    sla_tier: 'Overflowing Drains / Active Flooding',
    sla_deadline_hours: 24,
    cited_sla_rule: 'Section 4.2(b) — Active drain overflow causing road flooding is a Priority 1 issue. Response within 4 hours; full clearance within 24 hours.',
    formal_complaint: 'Road flooding is active near Pipliyahana Square after a brief downpour, caused by blocked storm drains. Section 4.2(b) mandates emergency pump deployment and clearance within 24 hours. The standing water poses a risk to motorists and needs immediate drainage.',
    escalation_authority: 'Chief Engineer, Water Supply / Municipal Commissioner',
    escalation_contact: 'drainage-head@indore.gov.in',
    upvotes: 11,
    hoursAgoCreated: 24,
    hoursAgoUpdated: 24,
    userId: 'user_05_vikram'
  },
  // 14. Flooding (in_progress)
  {
    category: 'flooding',
    status: 'in_progress',
    lat: 22.7110,
    lng: 75.8450,
    address: 'Chhota Ganpati Mandir Marg, Indore, Madhya Pradesh 452002',
    severity_score: 4,
    ai_description: 'Drainage water from an open channel is overflowing into the main pedestrian walk, creating a highly unsanitary flooded path. The foul water is backing up towards shop entrances.',
    suggested_department: 'Municipal Corporation',
    assigned_agency: 'Municipal Storm Water Drainage Department',
    sla_tier: 'Overflowing Drains / Active Flooding',
    sla_deadline_hours: 24,
    cited_sla_rule: 'Section 4.2(b) — Active drain overflow causing road flooding is a Priority 1 issue and must be resolved within 24 hours.',
    formal_complaint: 'Open drainage overflow has flooded the footpath on Chhota Ganpati Marg. Under Section 4.2(b), this sanitation hazard must be cleared within 24 hours. A drainage crew is requested to clear the blockage and sanitise the public path.',
    escalation_authority: 'Chief Engineer, Water Supply / Municipal Commissioner',
    escalation_contact: 'drainage-head@indore.gov.in',
    upvotes: 7,
    hoursAgoCreated: 48,
    hoursAgoUpdated: 24,
    userId: 'user_06_ananya'
  }
];

const duplicateTemplate = {
  category: 'road_damage',
  status: 'duplicate',
  lat: 22.7181,
  lng: 75.8541,
  address: 'Rajwada Palace Market Road, Indore, Madhya Pradesh 452002',
  severity_score: 5,
  ai_description: 'Exposed metal and massive crack on the main Rajwada Palace Road, right in the center of the walkway. Major safety hazard for pedestrians and shopping crowds.',
  suggested_department: 'PWD',
  assigned_agency: 'Public Works Department (PWD)',
  sla_tier: 'Section 3.2 — Road Damage and Infrastructure',
  sla_deadline_hours: 24,
  cited_sla_rule: 'Section 3.2 — All road infrastructure damage that creates an immediate public safety hazard is classified as Priority 1 and must be addressed within 24-72 hours.',
  formal_complaint: 'The pavement has collapsed on Rajwada Palace Road. This Priority 1 safety hazard must be cordoned off and repaired within 24 hours under Section 3.2. Pedestrians are at extreme risk of tripping and injury.',
  escalation_authority: 'District Collector (Roads Division) / Municipal Commissioner',
  escalation_contact: 'collector-indore@mp.gov.in',
  upvotes: 1,
  hoursAgoCreated: 72,
  hoursAgoUpdated: 72,
  userId: 'user_07_sanjay'
};

async function seed() {
  try {
    console.log('Clearing old issues from Firestore...');
    const issuesRef = db.collection('issues');
    const snapshot = await issuesRef.get();
    
    // Batch delete
    const batchSize = 100;
    if (snapshot.size > 0) {
      const chunks = [];
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        chunks.push(snapshot.docs.slice(i, i + batchSize));
      }
      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
      console.log(`Deleted ${snapshot.size} issues.`);
    }

    console.log('Seeding user profiles...');
    for (const u of users) {
      await db.collection('users').doc(u.userId).set({
        name: u.userName,
        civic_points: u.points,
        badges: u.points >= 200 ? ['active_citizen', 'top_reporter'] : ['active_citizen']
      }, { merge: true });
    }
    console.log('Users seeded.');

    console.log('Seeding 14 primary issues...');
    const insertedIds = {}; // category -> ID of a document (to link duplicate)
    let issue3Id = ''; // To explicitly track Issue 3 (Rajwada Pothole)

    for (let i = 0; i < issueTemplates.length; i++) {
      const t = issueTemplates[i];
      const createdDate = getPastDate(t.hoursAgoCreated);
      const updatedDate = getPastDate(t.hoursAgoUpdated);
      
      const user = users.find(u => u.userId === t.userId);

      const issueDoc = {
        mediaUrl: `https://picsum.photos/seed/civiclens_${i}/800/600`,
        mediaType: 'image',
        analysis: {
          category: t.category,
          severity_score: t.severity_score,
          ai_description: t.ai_description,
          suggested_department: t.suggested_department,
          is_urgent: t.severity_score >= 4,
          hazard_tags: t.category === 'pothole' ? ['traffic_risk', 'vehicle_damage', 'pedestrian_hazard'] : 
                       t.category === 'water_leak' ? ['health_risk', 'property_damage'] :
                       t.category === 'streetlight' ? ['public_safety', 'pedestrian_hazard'] :
                       t.category === 'waste' ? ['health_risk', 'public_safety'] :
                       t.category === 'flooding' ? ['flood_risk', 'traffic_risk', 'property_damage'] : ['public_safety']
        },
        routing: {
          assigned_agency: t.assigned_agency,
          sla_tier: t.sla_tier,
          sla_deadline_hours: t.sla_deadline_hours,
          cited_sla_rule: t.cited_sla_rule,
          formal_complaint: t.formal_complaint,
          escalation_authority: t.escalation_authority,
          escalation_contact: t.escalation_contact
        },
        location: {
          lat: t.lat,
          lng: t.lng,
          address: t.address
        },
        userId: t.userId,
        userName: user ? user.userName : 'Anonymous Citizen',
        status: t.status,
        upvotes: t.upvotes,
        createdAt: Timestamp.fromDate(createdDate),
        updatedAt: Timestamp.fromDate(updatedDate),
        created_at: Timestamp.fromDate(createdDate),
        updated_at: Timestamp.fromDate(updatedDate)
      };

      // Set SLA deadline timestamp explicitly
      const deadlineDate = new Date(createdDate.getTime() + t.sla_deadline_hours * 60 * 60 * 1000);
      issueDoc.sla_deadline_timestamp = Timestamp.fromDate(deadlineDate);

      // Add escalation notice if needed
      if (t.status === 'escalated' && t.escalation_notice) {
        issueDoc.escalation_notice = t.escalation_notice;
        issueDoc.escalation_count = 1;
        if (t.hoursAgoEscalated) {
          issueDoc.escalatedAt = Timestamp.fromDate(getPastDate(t.hoursAgoEscalated));
        }
      }

      const docRef = await db.collection('issues').add(issueDoc);
      insertedIds[t.category] = docRef.id;

      // Specifically capture Rajwada pothole (Issue 3) which is at index 2
      if (i === 2) {
        issue3Id = docRef.id;
      }
    }

    console.log('Seeding duplicate issue (Issue 15)...');
    const duplicateCreated = getPastDate(duplicateTemplate.hoursAgoCreated);
    const duplicateUpdated = getPastDate(duplicateTemplate.hoursAgoUpdated);
    const duplicateUser = users.find(u => u.userId === duplicateTemplate.userId);
    
    const duplicateDoc = {
      mediaUrl: `https://picsum.photos/seed/civiclens_14/800/600`,
      mediaType: 'image',
      analysis: {
        category: duplicateTemplate.category,
        severity_score: duplicateTemplate.severity_score,
        ai_description: duplicateTemplate.ai_description,
        suggested_department: duplicateTemplate.suggested_department,
        is_urgent: true,
        hazard_tags: ['pedestrian_hazard', 'public_safety']
      },
      routing: {
        assigned_agency: duplicateTemplate.assigned_agency,
        sla_tier: duplicateTemplate.sla_tier,
        sla_deadline_hours: duplicateTemplate.sla_deadline_hours,
        cited_sla_rule: duplicateTemplate.cited_sla_rule,
        formal_complaint: duplicateTemplate.formal_complaint,
        escalation_authority: duplicateTemplate.escalation_authority,
        escalation_contact: duplicateTemplate.escalation_contact
      },
      location: {
        lat: duplicateTemplate.lat,
        lng: duplicateTemplate.lng,
        address: duplicateTemplate.address
      },
      userId: duplicateTemplate.userId,
      userName: duplicateUser ? duplicateUser.userName : 'Anonymous Citizen',
      status: 'duplicate',
      duplicate_of: issue3Id || insertedIds['pothole'], // Link to the Rajwada Pothole issue (Issue 3)
      upvotes: duplicateTemplate.upvotes,
      createdAt: Timestamp.fromDate(duplicateCreated),
      updatedAt: Timestamp.fromDate(duplicateUpdated),
      created_at: Timestamp.fromDate(duplicateCreated),
      updated_at: Timestamp.fromDate(duplicateUpdated)
    };

    const deadlineDate = new Date(duplicateCreated.getTime() + duplicateTemplate.sla_deadline_hours * 60 * 60 * 1000);
    duplicateDoc.sla_deadline_timestamp = Timestamp.fromDate(deadlineDate);

    await db.collection('issues').add(duplicateDoc);

    console.log('✅ Seeded 15 issues successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
