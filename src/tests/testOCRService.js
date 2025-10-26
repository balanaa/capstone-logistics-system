// OCR Service Test
import { visionAIService } from '../services/googleVisionAI.js';

export async function testOCRService() {
  console.log('🔍 Testing OCR Service...');
  
  // Test with a sample image URL that contains text
  const testImageUrl = 'https://storage.googleapis.com/cloud-samples-data/vision/text/sign.jpg';
  
  try {
    console.log('📄 Testing with sample document image...');
    
    const result = await visionAIService.extractTextFromUrl(testImageUrl);
    
    if (result.success) {
      console.log('✅ OCR Service working!');
      console.log('📝 Extracted text:', result.fullText);
      console.log('🔢 Words found:', result.words?.length || 0);
      console.log('📊 Confidence:', result.confidence ? `${(result.confidence * 100).toFixed(1)}%` : 'N/A');
      
      return {
        success: true,
        message: 'OCR Service is working correctly',
        extractedText: result.fullText,
        wordCount: result.words?.length || 0,
        confidence: result.confidence
      };
    } else {
      console.log('❌ OCR Service failed:', result.error);
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error('❌ OCR Service test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testOCRService()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 OCR Service is ready for the /ocr route!');
      console.log('🌐 Visit: http://localhost:3000/ocr');
    } else {
      console.log('\n❌ OCR Service needs configuration');
      console.log('💡 Check your Google Cloud credentials');
    }
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
  });
