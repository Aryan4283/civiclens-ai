require('dotenv').config();
const { db, FieldValue } = require('./src/config/firebase');

async function test() {
  try {
    console.log('1. Testing issues collection add...');
    const docRef = await db.collection('issues').add({
      test: 'data',
      createdAt: FieldValue.serverTimestamp()
    });
    console.log('Success! Added issue:', docRef.id);
  } catch (error) {
    console.error('Error adding issue:', error.message);
  }

  try {
    console.log('\n2. Testing users collection set...');
    await db.collection('users').doc('test_user_123').set({
      civic_points: FieldValue.increment(10)
    }, { merge: true });
    console.log('Success! User points set.');
  } catch (error) {
    console.error('Error setting user:', error.message);
  }
}

test();
