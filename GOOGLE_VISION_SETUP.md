# Google Vision AI Setup Guide

## Quick Setup (API Key Method)

### Step 1: Get Google Cloud API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Cloud Vision API":
   - Go to "APIs & Services" → "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"
4. Create API Key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key

### Step 2: Configure Your Project

1. Create a `.env` file in your project root (same level as package.json)
2. Add this line to the `.env` file:
   ```
   REACT_APP_GOOGLE_API_KEY=your_actual_api_key_here
   ```
3. Replace `your_actual_api_key_here` with the API key you copied

### Step 3: Test the Connection

Run this command to test:

```bash
cd src/tests
node runSimpleTest.js
```

## What You Can Do with Google Vision AI

### 📄 Document Processing

- Extract text from receipts, invoices, BOLs
- Parse structured data automatically
- Validate document content

### 🧾 Receipt Analysis

- Extract amounts, dates, vendor names
- Identify receipt types
- Parse line items

### 📋 Form Recognition

- Extract data from shipping documents
- Process packing lists
- Analyze delivery orders

### 🔍 Data Validation

- Verify extracted information
- Check document completeness
- Flag potential errors

## Example Usage in Your Project

```javascript
// Import the service
import { visionAIService } from "../services/googleVisionAI.js";

// Extract text from uploaded receipt
const result = await visionAIService.extractTextFromUrl(imageUrl);

// Process receipt data
const receiptData = await visionAIService.processReceiptImage(imagePath);

// Detect document type
const docType = await visionAIService.detectDocumentType(imagePath);
```

## Troubleshooting

### Common Issues:

1. **"API key not found"**: Make sure your `.env` file is in the project root
2. **"Vision API not enabled"**: Enable the API in Google Cloud Console
3. **"Quota exceeded"**: Check your Google Cloud billing and quotas
4. **"Invalid API key"**: Verify the key is correct and has Vision API access

### Need Help?

- Check Google Cloud Console for API usage and errors
- Verify your project has billing enabled
- Make sure the Vision API is enabled for your project
