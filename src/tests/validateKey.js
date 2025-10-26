// API Key Validator Runner
import { testYourAPIKey } from './apiKeyValidator.js';

console.log('🔑 Google Cloud API Key Validator\n');

const result = testYourAPIKey();

if (result && result.valid) {
  console.log('\n✨ Next step: Test your connection with Google Vision AI');
  console.log('Run: node runSimpleTest.js');
} else {
  console.log('\n📋 Setup checklist:');
  console.log('1. Go to https://console.cloud.google.com/');
  console.log('2. Enable Vision API');
  console.log('3. Create API Key');
  console.log('4. Add to .env file: REACT_APP_GOOGLE_API_KEY=your_key');
  console.log('5. Run this validator again');
}
