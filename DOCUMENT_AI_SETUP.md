# Document AI Setup Guide

## Overview

This guide explains how to set up Google Document AI for robust table detection and extraction from scanned PDFs and images.

## Prerequisites

- Google Cloud Project with Document AI API enabled
- Service account with Document AI permissions
- Document AI processor created

## Setup Steps

### 1. Enable Document AI API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Library"
4. Search for "Document AI API"
5. Click "Enable"

### 2. Create Document AI Processor

1. Go to [Document AI Console](https://console.cloud.google.com/ai/document-ai)
2. Click "Create Processor"
3. Choose "Form Parser" processor type
4. Select your region (e.g., "us" for United States)
5. Give it a name (e.g., "table-extraction-processor")
6. Click "Create"

### 3. Get Processor Information

After creating the processor, note down:

- **Project ID**: Your Google Cloud project ID
- **Location**: The region where your processor is located (e.g., "us")
- **Processor ID**: Found in the processor details page

### 4. Set Up Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Create a new service account or use existing one
3. Grant these roles:
   - Document AI API User
   - Document AI API Editor
4. Create and download the JSON key file
5. Place it in your project root as `google-service-account.json`

### 5. Configure Environment Variables

Add these to your `.env` file:

```env
# Document AI Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us
DOCUMENT_AI_PROCESSOR_ID=your-processor-id

# Service Account (already exists)
GOOGLE_APPLICATION_CREDENTIALS=./google-service-account.json
```

### 6. Install Required Dependencies

```bash
npm install @google-cloud/documentai
```

## How It Works

### Document AI vs Vision AI

- **Document AI**: Specialized for document structure analysis, table detection, form parsing
- **Vision AI**: General-purpose image analysis, text detection

### Table Detection Process

1. **Document Upload**: Image/PDF sent to Document AI
2. **Structure Analysis**: Document AI detects tables, rows, columns
3. **Data Extraction**: Extracts text from each table cell
4. **Column Identification**: Finds commodity/description columns
5. **Product Extraction**: Extracts product names line-by-line
6. **Border Detection**: Stops at table boundaries

### Fallback Mechanism

If Document AI fails, the system automatically falls back to Vision AI for basic text extraction.

## Testing

### Test with Sample Document

1. Upload a document with tables to `/ocr`
2. Check the "Processing Method" shows "Document AI"
3. View "Table Data" tab to see detected tables
4. Verify commodity column detection

### Expected Results

- **Table Detection**: Shows number of tables found
- **Column Recognition**: Identifies commodity/description columns
- **Product Extraction**: Lists product names from each row
- **Border Detection**: Stops reading at table boundaries

## Troubleshooting

### Common Issues

#### "Document AI authentication not implemented"

- **Cause**: Service account not properly configured
- **Solution**: Ensure `google-service-account.json` exists and has correct permissions

#### "Document AI API error: 403"

- **Cause**: API not enabled or insufficient permissions
- **Solution**: Enable Document AI API and check service account roles

#### "Processor not found"

- **Cause**: Wrong processor ID or location
- **Solution**: Verify processor ID and location in environment variables

#### Falls back to Vision AI

- **Cause**: Document AI processing failed
- **Solution**: Check API quotas, processor status, and document format

### Debug Steps

1. Check browser console for error messages
2. Verify environment variables are set correctly
3. Test with simple document first
4. Check Google Cloud Console for API usage and errors

## Cost Considerations

### Document AI Pricing

- **Form Parser**: $1.50 per 1,000 pages
- **Free Tier**: 1,000 pages per month
- **Vision AI Fallback**: $1.50 per 1,000 images

### Optimization Tips

- Use Document AI for complex tables
- Use Vision AI for simple text extraction
- Implement caching for repeated documents
- Monitor usage in Google Cloud Console

## Future Enhancements

### Planned Features

- **Column Selection**: Manual column picker UI
- **Multi-format Support**: Excel, Word documents
- **Batch Processing**: Multiple documents at once
- **Custom Processors**: Specialized for specific document types

### Integration Options

- **Database Storage**: Save extracted data
- **Export Formats**: CSV, JSON, Excel
- **API Endpoints**: REST API for external access
- **Webhook Support**: Real-time processing notifications

## Support

### Resources

- [Document AI Documentation](https://cloud.google.com/document-ai/docs)
- [Form Parser Guide](https://cloud.google.com/document-ai/docs/form-parser)
- [API Reference](https://cloud.google.com/document-ai/docs/reference/rest)

### Getting Help

- Check Google Cloud Console for API status
- Review Document AI quotas and limits
- Test with sample documents first
- Use browser developer tools for debugging

