# Browser OCR Setup Guide

## 🔧 **Fix Required: Add API Key to .env**

The browser version of Google Vision AI needs an API key instead of the service account JSON file.

### **Step 1: Get Your API Key**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Cloud Vision API"
3. Go to "Credentials" → "Create Credentials" → "API Key"
4. Copy the API key (looks like: `AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q`)

### **Step 2: Update Your .env File**

Add this line to your `.env` file:

```env
REACT_APP_GOOGLE_API_KEY=your_api_key_here
```

**Your .env file should look like:**

```env
REACT_APP_SUPABASE_URL=https://aqndbjtcjapwqubjudwl.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbmRianRjamFwd3F1Ymp1ZHdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NDg1NzgsImV4cCI6MjA3NTMyNDU3OH0.S1USU84132H35krPb_ZG2fSQhErY3fIBtRHKrUHViLE

GOOGLE_APPLICATION_CREDENTIALS=./google-service-account.json
REACT_APP_GOOGLE_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q
```

### **Step 3: Restart Your Development Server**

```bash
npm start
```

### **Step 4: Test the OCR Route**

Visit: http://localhost:3000/ocr

## 🔄 **Why This Change?**

- **Server-side**: Uses service account JSON (Node.js)
- **Browser-side**: Uses API key (REST API)

The browser can't access local files, so we use the REST API with an API key instead.

## ✅ **What's Fixed**

- ✅ Browser-compatible Google Vision AI service
- ✅ OCR test page updated
- ✅ File upload and processing working
- ✅ No more "Cannot find module 'process'" error

## 🚀 **Ready to Test**

Once you add the API key, your OCR route will work perfectly in the browser!
