# Google Cloud API Key - Visual Guide

## 🔑 What Does an API Key Look Like?

A Google Cloud API key is a **long string of letters and numbers** that looks like this:

```
AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q
```

**Key characteristics:**

- Always starts with `AIza`
- Contains letters (A-Z) and numbers (0-9)
- About 39 characters long
- No spaces or special characters

## 📍 Where to Find Your API Key

### Step-by-Step Visual Guide:

#### 1. **Go to Google Cloud Console**

- Open: https://console.cloud.google.com/
- Sign in with your Google account

#### 2. **Select Your Project**

- Look for the project dropdown at the top
- Click on it and select your project (or create a new one)

#### 3. **Enable Vision API**

- In the left menu, click **"APIs & Services"**
- Click **"Library"**
- Search for **"Vision API"** or **"Cloud Vision API"**
- Click on it and press **"Enable"**

#### 4. **Create API Key**

- Go to **"APIs & Services"** → **"Credentials"**
- Click **"+ CREATE CREDENTIALS"**
- Select **"API key"**
- Your API key will appear in a popup!

#### 5. **Copy Your API Key**

- The popup will show your key like this:

```
API key created

AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q

[Copy] [Close]
```

- Click **"Copy"** to copy it to your clipboard

## 🛡️ Security Best Practices

### ⚠️ **Important Security Notes:**

- **Never share your API key publicly**
- **Don't commit it to GitHub** (use .env file)
- **Restrict your API key** (recommended)

### 🔒 **How to Restrict Your API Key:**

1. In the Credentials page, click the **pencil icon** next to your API key
2. Under **"Application restrictions"**:
   - Choose **"HTTP referrers"** for web apps
   - Add your domain (e.g., `localhost:3000/*`)
3. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Choose **"Cloud Vision API"**
4. Click **"Save"**

## 📝 **How to Use Your API Key**

### 1. **Create .env file** (in your project root):

```bash
# Create the file
touch .env
```

### 2. **Add your API key**:

```env
REACT_APP_GOOGLE_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q
```

### 3. **Test it**:

```bash
cd src/tests
node runSimpleTest.js
```

## 🚨 **Common Mistakes to Avoid**

❌ **Don't do this:**

- Put API key directly in code
- Share it in screenshots
- Commit it to version control
- Use it without restrictions

✅ **Do this:**

- Use environment variables
- Restrict the API key
- Keep it in .env file
- Add .env to .gitignore

## 🔍 **Can't Find Your API Key?**

If you can't find your API key:

1. **Check if you're in the right project**
2. **Make sure Vision API is enabled**
3. **Look in "APIs & Services" → "Credentials"**
4. **Create a new one if needed**

## 💡 **Pro Tips**

- **Test with a small image first**
- **Check your Google Cloud billing** (Vision API has free tier)
- **Monitor usage** in Google Cloud Console
- **Use different keys for development/production**

---

**Need help?** Check the Google Cloud Console for error messages or API usage statistics!
