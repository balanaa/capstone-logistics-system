// Simple OCR Test
import { ImageAnnotatorClient } from '@google-cloud/vision';

async function simpleOCRTest() {
  console.log('🔍 Simple OCR Test...');
  
  try {
    // Initialize client
    const client = new ImageAnnotatorClient({
      keyFilename: './google-service-account.json',
    });
    
    console.log('✅ Client initialized');
    
    // Test with sample image
    const testImageUrl = 'https://storage.googleapis.com/cloud-samples-data/vision/text/sign.jpg';
    console.log('📄 Testing with:', testImageUrl);
    
    const [result] = await client.textDetection(testImageUrl);
    console.log('📝 Result:', result);
    
    if (result.textAnnotations && result.textAnnotations.length > 0) {
      console.log('✅ Text found:', result.textAnnotations[0].description);
    } else {
      console.log('❌ No text found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleOCRTest();
