const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { db, FieldValue } = require('./src/config/firebase');

const IMAGES = {
  pothole: [
    '/seeds/pothole1.jpg',
    '/seeds/pothole2.jpg'
  ],
  water_leak: [
    '/seeds/water_leak1.jpg',
    '/seeds/water_leak2.jpg'
  ],
  waste: [
    '/seeds/waste1.jpg',
    '/seeds/waste2.jpg'
  ],
  streetlight: [
    '/seeds/streetlight1.jpg'
  ],
  flooding: [
    '/seeds/flooding1.jpg',
    '/seeds/flooding2.jpg'
  ],
  road_damage: [
    '/seeds/road_damage.jpg'
  ]
};

function getRandomImage(category) {
  const list = IMAGES[category] || IMAGES.pothole;
  return list[Math.floor(Math.random() * list.length)];
}

const SEED_DATA = [
  // --- MUMBAI CLUSTER: Flooding and Potholes ---
  {
    category: 'flooding',
    user_description: 'Water logging near Andheri Subway. It happens every time it rains lightly. Traffic is completely jammed.',
    media_url: '/seeds/flooding1.jpg',
    media_type: 'image',
    location: { lat: 19.1172, lng: 72.8441, address: 'Andheri Subway, Andheri West, Mumbai, Maharashtra 400058' },
    status: 'reported',
    upvotes: 45,
    analysis: {
      category: 'flooding',
      ai_description: 'Severe water logging causing traffic blockade at an underpass.',
      severity_score: 4,
      hazard_tags: ['Traffic Hazard', 'Water Logging']
    },
    routing: {
      assigned_agency: 'BMC Stormwater Dept',
      formal_complaint: 'Subject: Severe Flooding at Andheri Subway\n\nThis is to report severe water accumulation at Andheri Subway causing public disruption.',
      sla_tier: 'T2',
      sla_deadline_hours: 48,
      cited_sla_rule: 'BMC Code 14A: Arterial road blockages due to water logging must be pumped within 48 hours.'
    },
    createdAt: new Date(Date.now() - 50 * 60 * 60 * 1000) // 50 hours ago (overdue!)
  },
  {
    category: 'flooding',
    user_description: 'Milan subway is completely submerged again.',
    media_url: '/seeds/flooding2.jpg',
    media_type: 'image',
    location: { lat: 19.0924, lng: 72.8428, address: 'Milan Subway, Santacruz West, Mumbai, Maharashtra' },
    status: 'reported',
    upvotes: 21,
    analysis: { category: 'flooding', ai_description: 'Submerged underpass at Milan Subway.', severity_score: 5, hazard_tags: ['Severe Hazard'] },
    routing: { assigned_agency: 'BMC Stormwater Dept', sla_tier: 'T1', sla_deadline_hours: 24 },
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000) // 30 hours ago (overdue!)
  },
  {
    category: 'pothole',
    user_description: 'Massive crater on SV Road near Malad signal. Bikes are skidding.',
    media_url: '/seeds/pothole1.jpg',
    media_type: 'image',
    location: { lat: 19.1860, lng: 72.8485, address: 'SV Road, Malad West, Mumbai, Maharashtra' },
    status: 'in_progress',
    upvotes: 12,
    analysis: { category: 'pothole', ai_description: 'Deep pothole on arterial SV road causing skidding risk.', severity_score: 4, hazard_tags: ['Accident Risk'] },
    routing: { assigned_agency: 'BMC Roads Dept', sla_tier: 'T2', sla_deadline_hours: 72 },
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000)
  },

  // --- BANGALORE CLUSTER: Water Leaks and Road Damage ---
  {
    category: 'water_leak',
    user_description: 'Main Cauvery water supply pipe has burst near Whitefield main road. Gallons of water wasting.',
    media_url: '/seeds/water_leak1.jpg',
    media_type: 'image',
    location: { lat: 12.9698, lng: 77.7499, address: 'Whitefield Main Rd, Bengaluru, Karnataka' },
    status: 'reported',
    upvotes: 89,
    analysis: { category: 'water_leak', ai_description: 'Major pipe burst resulting in significant water wastage on main road.', severity_score: 5, hazard_tags: ['Water Wastage', 'Infrastructure Damage'] },
    routing: { assigned_agency: 'BWSSB', formal_complaint: 'Subject: Major Pipe Burst in Whitefield\n\nImmediate attention required to halt severe water wastage.', sla_tier: 'T1', sla_deadline_hours: 24, cited_sla_rule: 'BWSSB Section 4: Main line leaks require 24h resolution.' },
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
  },
  {
    category: 'road_damage',
    user_description: 'Road completely dug up by BESCOM and left open for 2 weeks in Koramangala.',
    media_url: '/seeds/road_damage.jpg',
    media_type: 'image',
    location: { lat: 12.9279, lng: 77.6271, address: '80 Feet Road, Koramangala, Bengaluru, Karnataka' },
    status: 'escalated',
    upvotes: 156,
    escalation_notice: 'ESCALATION: BESCOM road excavation left unrestored past 14-day SLA. Immediate penal action and restoration required.',
    analysis: { category: 'road_damage', ai_description: 'Unfinished excavation work left hazardous.', severity_score: 4, hazard_tags: ['Open Trench'] },
    routing: { assigned_agency: 'BBMP / BESCOM', sla_tier: 'T3', sla_deadline_hours: 168 },
    createdAt: new Date(Date.now() - 400 * 60 * 60 * 1000) // Long ago
  },

  // --- DELHI CLUSTER: Air/Waste and Streetlights ---
  {
    category: 'waste',
    user_description: 'Garbage dump overflowing onto the street in Okhla Phase 2. Burning smell in the evening.',
    media_url: '/seeds/waste1.jpg',
    media_type: 'image',
    location: { lat: 28.5286, lng: 77.2764, address: 'Okhla Phase II, New Delhi, Delhi 110020' },
    status: 'reported',
    upvotes: 67,
    analysis: { category: 'waste', ai_description: 'Overflowing garbage dump with alleged burning causing air pollution.', severity_score: 4, hazard_tags: ['Biohazard', 'Air Pollution'] },
    routing: { assigned_agency: 'MCD Solid Waste', sla_tier: 'T2', sla_deadline_hours: 48 },
    createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000)
  },
  {
    category: 'streetlight',
    user_description: 'Entire street is pitch dark in Dwarka Sector 12. Safety hazard for women.',
    media_url: '/seeds/streetlight1.jpg',
    media_type: 'image',
    location: { lat: 28.5921, lng: 77.0460, address: 'Sector 12, Dwarka, New Delhi, Delhi 110078' },
    status: 'reported',
    upvotes: 34,
    analysis: { category: 'streetlight', ai_description: 'Area-wide streetlight failure posing safety risks.', severity_score: 3, hazard_tags: ['Safety Risk', 'Visibility'] },
    routing: { assigned_agency: 'MCD Electrical', sla_tier: 'T3', sla_deadline_hours: 72 },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
  },

  // --- RAIPUR: User's specific area ---
  {
    category: 'pothole',
    user_description: 'Deep pothole right at the entrance of Green Meadows society.',
    media_url: '/seeds/pothole2.jpg',
    media_type: 'image',
    location: { lat: 21.2514, lng: 81.6296, address: 'Green Meadows, Raipur, Chhattisgarh' },
    status: 'resolved',
    upvotes: 8,
    analysis: { category: 'pothole', ai_description: 'Pothole at residential entrance.', severity_score: 2, hazard_tags: ['Minor Damage'] },
    routing: { assigned_agency: 'Raipur Municipal Corporation', sla_tier: 'T3', sla_deadline_hours: 120 },
    createdAt: new Date(Date.now() - 200 * 60 * 60 * 1000)
  },

  // --- INDORE: Cleanest City representation ---
  {
    category: 'waste',
    user_description: 'Someone dropped a plastic bag near Chappan Dukan. Need sweepers.',
    media_url: '/seeds/waste2.jpg',
    media_type: 'image',
    location: { lat: 22.7244, lng: 75.8839, address: 'Chappan Dukan, New Palasia, Indore, Madhya Pradesh' },
    status: 'resolved',
    upvotes: 2,
    analysis: { category: 'waste', ai_description: 'Minor littering in commercial area.', severity_score: 1, hazard_tags: [] },
    routing: { assigned_agency: 'Indore Municipal Corporation', sla_tier: 'T4', sla_deadline_hours: 24 },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Resolved quickly
  },
  
  // --- CHENNAI CLUSTER ---
  {
    category: 'water_leak',
    user_description: 'Drainage mixing with drinking water line in T Nagar.',
    media_url: '/seeds/water_leak2.jpg',
    media_type: 'image',
    location: { lat: 13.0418, lng: 80.2341, address: 'T Nagar, Chennai, Tamil Nadu' },
    status: 'reported',
    upvotes: 112,
    analysis: { category: 'water_leak', ai_description: 'Contamination of drinking water with sewage.', severity_score: 5, hazard_tags: ['Biohazard', 'Health Emergency'] },
    routing: { assigned_agency: 'CMWSSB', sla_tier: 'T1', sla_deadline_hours: 12 },
    createdAt: new Date(Date.now() - 15 * 60 * 60 * 1000) // Overdue!
  }
];

async function seed() {
  console.log('Seeding Indian Civic Issues data...');
  
  // 1. Delete existing issues
  const snapshot = await db.collection('issues').get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`Deleted ${snapshot.size} existing issues.`);

  // 2. Insert new issues
  const insertBatch = db.batch();
  SEED_DATA.forEach(data => {
    const docRef = db.collection('issues').doc();
    insertBatch.set(docRef, {
      ...data,
      userId: 'system_seed_user',
      createdAt: data.createdAt || FieldValue.serverTimestamp(),
      updatedAt: data.createdAt || FieldValue.serverTimestamp(),
      created_at: data.createdAt || FieldValue.serverTimestamp(),
      updated_at: data.createdAt || FieldValue.serverTimestamp()
    });
  });
  
  await insertBatch.commit();
  console.log(`Successfully seeded ${SEED_DATA.length} high-quality Indian issues!`);
}

seed().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
