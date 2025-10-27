// Simple test runner for Google Vision AI
import { runAllVisionTests } from './testVisionAI.js';

// Run the tests when this file is executed
console.log('🚀 Starting Google Vision AI Connection Test...\n');

runAllVisionTests()
  .then(results => {
    console.log('\n🎯 Test Summary:');
    console.log(`Overall Success: ${results.overall ? 'YES' : 'NO'}`);
    
    if (results.overall) {
      console.log('🎉 Google Vision AI is ready to use!');
      console.log('\n💡 You can now use Vision AI for:');
      console.log('   - Document text extraction');
      console.log('   - Image analysis and labeling');
      console.log('   - Face detection');
      console.log('   - Object recognition');
      console.log('   - Receipt/invoice processing');
    } else {
      console.log('❌ Please check your Google Cloud setup:');
      console.log('   1. Enable Vision API in Google Cloud Console');
      console.log('   2. Create service account credentials');
      console.log('   3. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
      console.log('   4. Or set REACT_APP_GOOGLE_API_KEY for API key method');
    }
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error);
  });
