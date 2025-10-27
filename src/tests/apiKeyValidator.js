// API Key Format Validator
export function validateAPIKey(apiKey) {
  console.log('🔍 Validating API key format...');
  
  if (!apiKey) {
    console.log('❌ No API key provided');
    return { valid: false, message: 'No API key provided' };
  }
  
  // Check if it starts with AIza
  if (!apiKey.startsWith('AIza')) {
    console.log('❌ Invalid format: API key should start with "AIza"');
    return { valid: false, message: 'API key should start with "AIza"' };
  }
  
  // Check length (Google API keys are typically 39 characters)
  if (apiKey.length < 35 || apiKey.length > 45) {
    console.log('❌ Invalid length: API key should be around 39 characters');
    return { valid: false, message: 'API key length seems incorrect' };
  }
  
  // Check for valid characters (alphanumeric only)
  if (!/^[A-Za-z0-9]+$/.test(apiKey)) {
    console.log('❌ Invalid characters: API key should only contain letters and numbers');
    return { valid: false, message: 'API key contains invalid characters' };
  }
  
  console.log('✅ API key format looks correct!');
  console.log(`📏 Length: ${apiKey.length} characters`);
  console.log(`🔤 Starts with: ${apiKey.substring(0, 4)}`);
  console.log(`🔤 Sample: ${apiKey.substring(0, 10)}...`);
  
  return { 
    valid: true, 
    message: 'API key format is valid',
    length: apiKey.length,
    prefix: apiKey.substring(0, 4)
  };
}

// Test function to check your API key
export function testYourAPIKey() {
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
  
  console.log('🚀 Testing your API key...\n');
  
  if (!apiKey) {
    console.log('❌ No API key found in environment variables');
    console.log('💡 Make sure you have REACT_APP_GOOGLE_API_KEY in your .env file');
    return;
  }
  
  // Validate format
  const validation = validateAPIKey(apiKey);
  
  if (!validation.valid) {
    console.log(`❌ ${validation.message}`);
    console.log('\n📋 Your API key should look like:');
    console.log('   AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q');
    console.log('\n🔗 Get your API key from: https://console.cloud.google.com/');
    return;
  }
  
  console.log('\n🎉 Your API key format is correct!');
  console.log('✅ Ready to test with Google Vision AI');
  
  return validation;
}

// Export for use
export default {
  validateAPIKey,
  testYourAPIKey
};
