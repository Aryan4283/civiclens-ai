const path = require('path');
require('dotenv').config();

const { db, FieldValue } = require('./src/config/firebase');

async function runTest() {
  try {
    console.log('--- PREPARING TEST ISSUES IN FIRESTORE ---');
    
    // 1. Issue 1: Overdue Streetlight issue (Original)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    const issue1Ref = await db.collection('issues').add({
      analysis: {
        category: 'streetlight',
        severity_score: 3,
        ai_description: 'Streetlight completely dark on main road margin.',
        suggested_department: 'Electricity Department'
      },
      routing: {
        assigned_agency: 'Electricity Department',
        sla_deadline_hours: 24
      },
      location: {
        lat: 28.7041,
        lng: 77.1025,
        address: "Pothole road, Delhi, India"
      },
      status: 'reported',
      upvotes: 0,
      createdAt: fiveDaysAgo,
      updatedAt: fiveDaysAgo
    });
    console.log(`Created Issue 1 (Original, Overdue): ${issue1Ref.id}`);

    // 2. Issue 2: Nearby Streetlight issue (Duplicate of Issue 1)
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    
    const issue2Ref = await db.collection('issues').add({
      analysis: {
        category: 'streetlight',
        severity_score: 3,
        ai_description: 'Light pole not working near pothole road.',
        suggested_department: 'Electricity Department'
      },
      routing: {
        assigned_agency: 'Electricity Department',
        sla_deadline_hours: 24
      },
      location: {
        lat: 28.7042,
        lng: 77.1026,
        address: "Pothole road, Delhi, India"
      },
      status: 'reported',
      upvotes: 0,
      createdAt: fourDaysAgo,
      updatedAt: fourDaysAgo
    });
    console.log(`Created Issue 2 (Duplicate, Nearby): ${issue2Ref.id}`);

    // 3. Issue 3: Non-overdue Water Leak issue
    const justNow = new Date();
    const issue3Ref = await db.collection('issues').add({
      analysis: {
        category: 'water_leak',
        severity_score: 2,
        ai_description: 'Slow dripping from secondary supply line.',
        suggested_department: 'Water Board'
      },
      routing: {
        assigned_agency: 'Water Board',
        sla_deadline_hours: 72
      },
      location: {
        lat: 29.0000,
        lng: 78.0000,
        address: "Clean Street, Delhi, India"
      },
      status: 'reported',
      upvotes: 0,
      createdAt: justNow,
      updatedAt: justNow
    });
    console.log(`Created Issue 3 (Non-overdue): ${issue3Ref.id}`);

    // 4. Issue 4: Overdue but already escalated issue
    const issue4Ref = await db.collection('issues').add({
      analysis: {
        category: 'waste',
        severity_score: 4,
        ai_description: 'Large garbage heap accumulated.',
        suggested_department: 'Municipal Sanitation'
      },
      routing: {
        assigned_agency: 'Municipal Sanitation',
        sla_deadline_hours: 24
      },
      location: {
        lat: 28.8000,
        lng: 77.2000,
        address: "Garbage lane, Delhi, India"
      },
      status: 'escalated',
      upvotes: 0,
      createdAt: fiveDaysAgo,
      updatedAt: fiveDaysAgo
    });
    console.log(`Created Issue 4 (Already Escalated): ${issue4Ref.id}`);

    console.log('\n--- RUNNING ESCALATOR AGENT VIA ENDPOINT ---');
    const res = await fetch('http://localhost:3001/api/escalator/run', {
      method: 'POST'
    });
    const result = await res.json();
    console.log('Agent Run Result:', JSON.stringify(result, null, 2));

    console.log('\n--- VERIFYING RESULTS IN FIRESTORE ---');
    
    // Check Issue 1 (Original, should be escalated, upvotes incremented)
    const doc1 = await db.collection('issues').doc(issue1Ref.id).get();
    const data1 = doc1.data();
    console.log(`\nIssue 1 (${issue1Ref.id}):`);
    console.log(`- Status (Expected: escalated): ${data1.status}`);
    console.log(`- Upvotes (Expected: 1): ${data1.upvotes}`);
    console.log(`- Escalation count (Expected: 1): ${data1.escalation_count}`);
    console.log(`- Escalation notice: ${data1.escalation_notice ? data1.escalation_notice.substring(0, 150) + '...' : 'None'}`);

    // Check Issue 2 (Duplicate, should be status: duplicate, duplicate_of: Issue 1)
    const doc2 = await db.collection('issues').doc(issue2Ref.id).get();
    const data2 = doc2.data();
    console.log(`\nIssue 2 (${issue2Ref.id}):`);
    console.log(`- Status (Expected: duplicate): ${data2.status}`);
    console.log(`- Duplicate of (Expected: ${issue1Ref.id}): ${data2.duplicate_of}`);

    // Check Issue 3 (Non-overdue, should be reported)
    const doc3 = await db.collection('issues').doc(issue3Ref.id).get();
    const data3 = doc3.data();
    console.log(`\nIssue 3 (${issue3Ref.id}):`);
    console.log(`- Status (Expected: reported): ${data3.status}`);

    // Check Issue 4 (Already escalated, status should remain escalated, no new notice/count change)
    const doc4 = await db.collection('issues').doc(issue4Ref.id).get();
    const data4 = doc4.data();
    console.log(`\nIssue 4 (${issue4Ref.id}):`);
    console.log(`- Status (Expected: escalated): ${data4.status}`);
    console.log(`- Escalation count (Expected: undefined/none): ${data4.escalation_count}`);

    // Clean up test issues to avoid cluttering db
    console.log('\n--- CLEANING UP TEST DOCUMENTS ---');
    await db.collection('issues').doc(issue1Ref.id).delete();
    await db.collection('issues').doc(issue2Ref.id).delete();
    await db.collection('issues').doc(issue3Ref.id).delete();
    await db.collection('issues').doc(issue4Ref.id).delete();
    console.log('Cleanup completed!');

  } catch (error) {
    console.error('Test script error:', error);
  }
}

runTest();
