// Simple Google Vision AI Test with API Key
// This test works without service account files

export async function testVisionWithAPIKey() {
  // You can get this API key from Google Cloud Console
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY || 'YOUR_API_KEY_HERE';
  
  if (apiKey === 'YOUR_API_KEY_HERE') {
    console.log('❌ Please set your Google Vision API key:');
    console.log('   1. Go to https://console.cloud.google.com/');
    console.log('   2. Enable Vision API');
    console.log('   3. Create an API Key');
    console.log('   4. Set REACT_APP_GOOGLE_API_KEY in your .env file');
    return { success: false, message: 'API key not configured' };
  }

  console.log('🔍 Testing Google Vision AI with API key...');
  
  const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Pierre-Person.jpg/640px-Pierre-Person.jpg';
  
  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              source: {
                imageUri: testImageUrl
              }
            },
            features: [
              {
                type: 'LABEL_DETECTION',
                maxResults: 5
              },
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              },
              {
                type: 'FACE_DETECTION',
                maxResults: 5
              }
            ]
          }
        ]
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error:', result);
      return { success: false, error: result };
    }

    console.log('✅ Google Vision AI is working!');
    console.log('📋 Labels detected:', result.responses?.[0]?.labelAnnotations?.length || 0);
    console.log('📝 Text detected:', result.responses?.[0]?.textAnnotations?.length || 0);
    console.log('👤 Faces detected:', result.responses?.[0]?.faceAnnotations?.length || 0);
    
    // Show some sample results
    if (result.responses?.[0]?.labelAnnotations) {
      console.log('\n🏷️ Top labels:');
      result.responses[0].labelAnnotations.forEach((label, index) => {
        console.log(`   ${index + 1}. ${label.description} (${(label.score * 100).toFixed(1)}% confidence)`);
      });
    }

    return {
      success: true,
      message: 'Google Vision AI connection successful!',
      data: result.responses[0]
    };

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test document processing capabilities
export async function testDocumentProcessing(apiKey) {
  console.log('📄 Testing document processing capabilities...');
  
  // Test with a document image
  const documentUrl = 'https://storage.googleapis.com/cloud-samples-data/vision/text/sign.jpg';
  
  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              source: {
                imageUri: documentUrl
              }
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              },
              {
                type: 'LABEL_DETECTION',
                maxResults: 3
              }
            ]
          }
        ]
      })
    });

    const result = await response.json();
    
    if (result.responses?.[0]?.textAnnotations?.[0]) {
      console.log('✅ Document text extraction working!');
      console.log('📝 Extracted text:', result.responses[0].textAnnotations[0].description);
    }

    return {
      success: true,
      extractedText: result.responses?.[0]?.textAnnotations?.[0]?.description || 'No text found'
    };

  } catch (error) {
    console.error('❌ Document processing test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run all tests
export async function runSimpleVisionTests() {
  console.log('🚀 Running Simple Google Vision AI Tests\n');
  
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY || 'YOUR_API_KEY_HERE';
  
  if (apiKey === 'YOUR_API_KEY_HERE') {
    console.log('❌ No API key found. Please set REACT_APP_GOOGLE_API_KEY');
    console.log('\n📋 Quick Setup Guide:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create/select a project');
    console.log('3. Enable "Cloud Vision API"');
    console.log('4. Go to "Credentials" → "Create Credentials" → "API Key"');
    console.log('5. Copy the API key');
    console.log('6. Create a .env file in your project root');
    console.log('7. Add: REACT_APP_GOOGLE_API_KEY=your_api_key_here');
    console.log('8. Restart your development server');
    return;
  }

  // Test 1: Basic Vision AI
  console.log('='.repeat(50));
  console.log('TEST 1: Basic Vision AI');
  console.log('='.repeat(50));
  const basicTest = await testVisionWithAPIKey();
  
  // Test 2: Document Processing
  console.log('\n' + '='.repeat(50));
  console.log('TEST 2: Document Processing');
  console.log('='.repeat(50));
  const docTest = await testDocumentProcessing(apiKey);
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`Basic Vision AI: ${basicTest.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Document Processing: ${docTest.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (basicTest.success) {
    console.log('\n🎉 Google Vision AI is ready to use!');
    console.log('\n💡 You can now use it for:');
    console.log('   - 📄 Document text extraction');
    console.log('   - 🧾 Receipt/invoice processing');
    console.log('   - 🏷️ Image labeling and classification');
    console.log('   - 👤 Face detection');
    console.log('   - 🎯 Object recognition');
  }
}

// Export for use
export default {
  testVisionWithAPIKey,
  testDocumentProcessing,
  runSimpleVisionTests
};
