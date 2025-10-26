// Simple runner for Google Vision AI test
import { runSimpleVisionTests } from './simpleVisionTest.js';

console.log('🚀 Starting Simple Google Vision AI Test...\n');

runSimpleVisionTests()
  .then(() => {
    console.log('\n✨ Test completed!');
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
  });
