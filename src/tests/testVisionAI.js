// Google Vision AI Connection Test
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Test function to check Google Vision AI connection
export async function testVisionAIConnection() {
  console.log('🔍 Testing Google Vision AI connection...');
  
  try {
    // Initialize the Vision API client
    const client = new ImageAnnotatorClient({
      // Use environment variable for credentials
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || '../../google-service-account.json',
    });

    console.log('✅ Vision API client initialized');

    // Test with a sample image URL
    const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Pierre-Person.jpg/640px-Pierre-Person.jpg';
    
    console.log('🔍 Testing with sample image:', testImageUrl);

    // Test 1: Label Detection
    console.log('\n📋 Testing Label Detection...');
    const [labelResult] = await client.labelDetection(testImageUrl);
    console.log('✅ Label Detection Results:');
    labelResult.labelAnnotations.forEach(label => {
      console.log(`  - ${label.description}: ${(label.score * 100).toFixed(1)}% confidence`);
    });

    // Test 2: Text Detection
    console.log('\n📝 Testing Text Detection...');
    const [textResult] = await client.textDetection(testImageUrl);
    console.log('✅ Text Detection Results:');
    if (textResult.textAnnotations && textResult.textAnnotations.length > 0) {
      console.log(`  - Found text: "${textResult.textAnnotations[0].description}"`);
    } else {
      console.log('  - No text detected in image');
    }

    // Test 3: Face Detection
    console.log('\n👤 Testing Face Detection...');
    const [faceResult] = await client.faceDetection(testImageUrl);
    console.log('✅ Face Detection Results:');
    console.log(`  - Faces detected: ${faceResult.faceAnnotations ? faceResult.faceAnnotations.length : 0}`);

    // Test 4: Object Localization
    console.log('\n🎯 Testing Object Localization...');
    const [objectResult] = await client.objectLocalization(testImageUrl);
    console.log('✅ Object Localization Results:');
    if (objectResult.localizedObjectAnnotations) {
      objectResult.localizedObjectAnnotations.forEach(obj => {
        console.log(`  - ${obj.name}: ${(obj.score * 100).toFixed(1)}% confidence`);
      });
    }

    console.log('\n🎉 All Google Vision AI tests completed successfully!');
    return {
      success: true,
      message: 'Google Vision AI connection is working properly',
      tests: {
        labelDetection: labelResult.labelAnnotations?.length || 0,
        textDetection: textResult.textAnnotations?.length || 0,
        faceDetection: faceResult.faceAnnotations?.length || 0,
        objectLocalization: objectResult.localizedObjectAnnotations?.length || 0
      }
    };

  } catch (error) {
    console.error('❌ Google Vision AI connection test failed:', error);
    
    // Provide helpful error messages
    if (error.message.includes('credentials')) {
      console.error('💡 Make sure you have:');
      console.error('   1. Created a Google Cloud service account');
      console.error('   2. Downloaded the JSON key file');
      console.error('   3. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
      console.error('   4. Enabled the Vision API in your Google Cloud project');
    }
    
    return {
      success: false,
      error: error.message,
      message: 'Google Vision AI connection failed'
    };
  }
}

// Test function using API key (alternative method)
export async function testVisionAPIWithKey() {
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ REACT_APP_GOOGLE_API_KEY not found in environment variables');
    return { success: false, error: 'API key not found' };
  }

  console.log('🔍 Testing Vision API with API key...');
  
  const testImage = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Pierre-Person.jpg/640px-Pierre-Person.jpg";

  try {
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { source: { imageUri: testImage } },
            features: [
              { type: 'LABEL_DETECTION' },
              { type: 'TEXT_DETECTION' },
              { type: 'FACE_DETECTION' }
            ]
          }
        ]
      })
    });

    const result = await res.json();
    
    if (!res.ok) {
      throw new Error(JSON.stringify(result));
    }

    console.log('✅ Vision API (API Key method) connected successfully:');
    console.log('📋 Labels:', result.responses?.[0]?.labelAnnotations?.length || 0);
    console.log('📝 Text:', result.responses?.[0]?.textAnnotations?.length || 0);
    console.log('👤 Faces:', result.responses?.[0]?.faceAnnotations?.length || 0);
    
    return {
      success: true,
      message: 'Vision API (API Key method) is working',
      data: result.responses?.[0]
    };
  } catch (error) {
    console.error('❌ Vision API (API Key method) connection failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Vision API (API Key method) failed'
    };
  }
}

// Comprehensive test function
export async function runAllVisionTests() {
  console.log('🚀 Starting comprehensive Google Vision AI tests...\n');
  
  const results = {
    serviceAccount: null,
    apiKey: null,
    overall: false
  };

  // Test 1: Service Account method
  console.log('='.repeat(50));
  console.log('TEST 1: Service Account Authentication');
  console.log('='.repeat(50));
  results.serviceAccount = await testVisionAIConnection();

  // Test 2: API Key method
  console.log('\n' + '='.repeat(50));
  console.log('TEST 2: API Key Authentication');
  console.log('='.repeat(50));
  results.apiKey = await testVisionAPIWithKey();

  // Overall result
  results.overall = results.serviceAccount.success || results.apiKey.success;

  console.log('\n' + '='.repeat(50));
  console.log('FINAL RESULTS');
  console.log('='.repeat(50));
  console.log(`Service Account Method: ${results.serviceAccount.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`API Key Method: ${results.apiKey.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Overall Status: ${results.overall ? '✅ CONNECTED' : '❌ NOT CONNECTED'}`);

  return results;
}

// Export for use in other files
export default {
  testVisionAIConnection,
  testVisionAPIWithKey,
  runAllVisionTests
};
