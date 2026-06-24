require('dotenv').config();
const { db } = require('./src/config/firebase');

async function run() {
    try {
        console.log('1. Analyzing Media...');
        const analyzeRes = await fetch('http://localhost:3001/api/issues/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Pothole_on_a_road_in_Letchworth_Garden_City.jpg',
                mediaType: 'image'
            })
        });
        const analyzeData = await analyzeRes.json();
        console.log('Analyze Data:', JSON.stringify(analyzeData, null, 2));

        if (!analyzeData.success) {
            console.error('Analysis failed, aborting submit test.');
            return;
        }

        console.log('\n2. Submitting Issue...');
        const submitRes = await fetch('http://localhost:3001/api/issues/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Pothole_on_a_road_in_Letchworth_Garden_City.jpg',
                mediaType: 'image',
                analysis: analyzeData.analysis,
                location: {
                    lat: 28.7041,
                    lng: 77.1025,
                    address: "Delhi, India"
                },
                userId: 'test_user_123'
            })
        });

        const submitData = await submitRes.json();
        console.log('Submit Data:', JSON.stringify(submitData, null, 2));

        if (!submitData.success) {
            console.error('Submit failed, aborting query test.');
            return;
        }

        console.log('\n3. Verifying Firestore Data...');
        const issueId = submitData.issueId;
        const issueDoc = await db.collection('issues').doc(issueId).get();
        const userDoc = await db.collection('users').doc('test_user_123').get();

        console.log('\n--- VERIFICATION RESULTS ---');
        if (issueDoc.exists) {
            const data = issueDoc.data();
            console.log('Issue Document exists!');
            console.log(`- formal_complaint: ${data.routing?.formal_complaint ? 'Present' : 'Missing'}`);
            console.log(`- cited_sla_rule: ${data.routing?.cited_sla_rule ? 'Present' : 'Missing'}`);
            console.log(`  Value: ${data.routing?.cited_sla_rule}`);
        } else {
            console.log('Issue Document: NOT FOUND');
        }

        if (userDoc.exists) {
            console.log('\nUser Document exists!');
            console.log(`- civic_points: ${userDoc.data().civic_points}`);
        } else {
            console.log('\nUser Document: NOT FOUND');
        }

    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

run();
