const { db, FieldValue } = require('./src/config/firebase');

async function test() {
  try {
    console.log('Adding to issues...');
    const docRef = await db.collection('issues').add({
      test: 'data',
      createdAt: FieldValue.serverTimestamp()
    });
    console.log('Added issue:', docRef.id);

    console.log('Setting user points...');
    await db.collection('users').doc('test_user_123').set({
      civic_points: FieldValue.increment(10)
    }, { merge: true });
    console.log('User points set.');
  } catch (error) {
    console.error('Firestore Error:', error);
  }
}

test();
