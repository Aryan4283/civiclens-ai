async function run() {
    try {
        const res = await fetch('http://localhost:3001/api/issues/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Pothole_on_a_road_in_Letchworth_Garden_City.jpg',
                mediaType: 'image'
            })
        });
        const data = await res.json();
        console.log('RESPONSE:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

run();

