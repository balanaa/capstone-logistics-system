const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;

export async function testVisionAPI() {
  const testImage =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Pierre-Person.jpg/640px-Pierre-Person.jpg";

  try {
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}` , {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { source: { imageUri: testImage } },
            features: [{ type: 'TEXT_DETECTION' }]
          }
        ]
      })
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(JSON.stringify(result));
    }

    console.log('✅ Vision API connected successfully:');
    console.log(result.responses?.[0]);
  } catch (error) {
    console.error('❌ Vision API connection failed:', error);
  }
}
