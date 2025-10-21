const { GoogleAuth } = require('google-auth-library');

async function testGoogleAuth() {
  try {
    const auth = new GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-service-account.json',
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    console.log('✅ Successfully authenticated to Google Cloud.');
    console.log('Project ID:', projectId);
  } catch (err) {
    console.error('❌ Google Cloud authentication failed:', err.message);
    process.exitCode = 1;
  }
}

testGoogleAuth();


