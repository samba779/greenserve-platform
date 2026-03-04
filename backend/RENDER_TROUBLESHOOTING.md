# Render Deployment Troubleshooting Guide

## 🔧 Common Render Issues & Solutions

### 1. **Build/Start Command Issues**

**Problem:** "Cannot find module" or "command not found"

**Solution:**
```bash
# In Render Dashboard > Settings:
Build Command: cd backend && npm install
Start Command: cd backend && npm start
```

### 2. **Environment Variables Missing**

**Problem:** Database connection failed, JWT_SECRET missing

**Solution:** Add these in Render Dashboard > Environment:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/greenserve
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
FRONTEND_URL=https://your-frontend-url.vercel.app
NODE_ENV=production
PORT=5000

# Email (for OTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. **Port Binding Issue**

**Problem:** "Port already in use" or app crashes

**Solution:** Use `process.env.PORT`:
```javascript
const PORT = process.env.PORT || 5000;
```

### 4. **Database Connection Timeout**

**Problem:** MongoDB connection times out

**Solution:**
```javascript
// In database.js - add connection options
const conn = await mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### 5. **CORS Issues**

**Problem:** Frontend can't connect to backend

**Solution:** Update CORS origin in server.js:
```javascript
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'https://greenserve-platform.vercel.app',
    'https://your-frontend-url.vercel.app'
  ].filter(Boolean),
  credentials: true
}));
```

## 🚀 Quick Fix Steps

### Step 1: Check Render Logs
1. Go to Render Dashboard
2. Click on your service
3. Check "Logs" tab for errors

### Step 2: Verify Environment Variables
1. Go to "Environment" tab
2. Ensure all required variables are set
3. Check for typos in variable names

### Step 3: Check Build Settings
- **Root Directory:** `backend` (or leave blank if backend is root)
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### Step 4: Test Locally First
```bash
cd backend
npm install
npm start
```
If it works locally but not on Render, it's likely an environment variable issue.

## 🔍 Debugging Commands

### Check if server is running:
```bash
curl https://your-render-url.onrender.com/api/health
```

### Check database connection:
```bash
# In server.js, add this route temporarily:
app.get('/api/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok', 
    db: dbStatus,
    timestamp: new Date().toISOString()
  });
});
```

## 🆘 Emergency Fixes

### If server keeps crashing:
1. **Check memory usage** - Upgrade to paid plan if needed
2. **Add error handling** - Wrap all async functions
3. **Check for infinite loops** - Review any setInterval/setTimeout
4. **Database connection** - Ensure MongoDB URI is correct

### If deployment fails:
1. Check if `package.json` has all dependencies
2. Ensure `server.js` exists in root
3. Verify Node.js version (use 18.x or 20.x)
4. Check for syntax errors in recent commits

## ✅ Render Dashboard Settings

**Service Name:** greenserve-backend  
**Runtime:** Node  
**Build Command:** `npm install`  
**Start Command:** `npm start`  
**Root Directory:** `backend` (if backend folder exists)  

**Environment Variables:**
- MONGODB_URI (required)
- JWT_SECRET (required)  
- FRONTEND_URL (required for CORS)
- EMAIL_USER (for OTP)
- EMAIL_PASS (for OTP)

## 📞 Need More Help?

Check Render docs: https://render.com/docs/deploy-node-express-app
Or check logs for specific error messages.
