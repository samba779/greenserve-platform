# EcoWorkConnect Project - File Organization

## 📁 FRONTEND (Client-Side Files)

### HTML Files (User Interface)
- index.html - Home/Landing page
- services.html - Services listing page
- service-detail.html - Individual service booking page
- bookings.html - User bookings dashboard
- login.html - User login page
- register.html - User registration page
- otp-verify.html - OTP verification page
- forgot-password.html - Password reset page
- payment.html - Payment processing page
- rating.html - Service rating page
- tracking.html - Service tracking page
- workers.html - Find workers page
- worker-login.html - Worker login page
- worker-register.html - Worker registration page
- worker-portal.html - Worker dashboard
- worker-dashboard.html - Worker main dashboard

### CSS & Styling
- css/styles.css - Main stylesheet

### JavaScript
- js/app.js - Main application logic

---

## 📁 BACKEND (Server-Side Files)

### Main Backend Directory: /backend/

#### Configuration Files
- backend/.env - Environment variables (MongoDB URI, JWT Secret, etc.)
- backend/package.json - Node.js dependencies
- backend/package-lock.json - Dependency lock file

#### Server Files
- backend/server.js - Main Express server
- backend/config/ - Configuration files

#### API Routes
- backend/routes/auth.js - Authentication routes (login, register, OTP)
- backend/routes/services.js - Service management routes
- backend/routes/bookings.js - Booking management routes
- backend/routes/workers.js - Worker management routes
- backend/routes/users.js - User management routes

#### Database Models
- backend/models/User.js - User schema
- backend/models/Service.js - Service schema
- backend/models/Booking.js - Booking schema
- backend/models/Worker.js - Worker schema

#### Middleware
- backend/middleware/auth.js - JWT authentication middleware
- backend/middleware/validation.js - Input validation middleware

#### Controllers
- backend/controllers/authController.js - Authentication logic
- backend/controllers/serviceController.js - Service logic
- backend/controllers/bookingController.js - Booking logic

#### Utils
- backend/utils/jwt.js - JWT utilities
- backend/utils/email.js - Email utilities
- backend/utils/otp.js - OTP generation utilities

### Functions Directory
- functions/ - Firebase functions (if any)

---

## 📁 DATABASE (Data Storage)

### MongoDB Collections
1. **Users Collection**
   - User profiles (end-users)
   - Authentication data
   - Contact information

2. **Services Collection**
   - Service categories
   - Service details
   - Pricing information

3. **Bookings Collection**
   - Booking records
   - Status tracking
   - Payment information

4. **Workers Collection**
   - Worker profiles
   - Service provider details
   - Availability status

### Database Configuration
- Mongoose ODM for MongoDB
- Schema definitions in backend/models/
- Connection configured in backend/.env

---

## 📁 PROJECT CONFIGURATION & DEPLOYMENT

### Firebase Configuration
- .firebaserc - Firebase project config
- firebase.json - Firebase hosting config
- firestore.rules - Firestore security rules
- functions/ - Firebase cloud functions

### Version Control
- .git/ - Git repository
- .gitignore - Git ignore rules

### IDE Configuration
- .vscode/ - VS Code settings

### Package Management
- package.json - Frontend dependencies
- package-lock.json - Dependency lock
- node_modules/ - Installed packages

---

## 📁 PRESENTATION & DOCUMENTATION (Local Only)

### Abstract Files
- ECOWORKCONNECT_ABSTRACT.md - Detailed abstract
- ECOWORKCONNECT_ABSTRACT_FINAL.md - Concise 8-line abstract
- PPT_ABSTRACT.md - PowerPoint abstract slide

### Presentation Files
- ECOWORKCONNECT_PRESENTATION.md - Full presentation content
- ECOWORKCONNECT_SLIDES.md - Slide content
- ECOWORKCONNECT_PPT_PRESENTATION.md - Complete 8-slide presentation

### Legacy Files
- QUICK_PPT_SLIDES.md - Empty/deprecated

---

## 📁 SYSTEM FILES

### OS Files
- desktop.ini - Windows desktop configuration

### Temporary Files
- firebase-debug.log - Firebase debug logs

---

## 🎯 FILE COUNT SUMMARY

**Frontend:** 17 HTML files, 1 CSS file, 1 JS file
**Backend:** 1 server file, 4 route files, 4 model files, 2 middleware files
**Database:** MongoDB with 4 collections
**Configuration:** 10+ config files
**Documentation:** 6 presentation files

**Total:** 40+ project files

---

## 🚀 DEPLOYMENT STRUCTURE

### Frontend Hosting
- **Platform:** Vercel / Firebase
- **URL:** https://greenserve-platform.vercel.app/

### Backend Hosting
- **Platform:** Render
- **URL:** https://greenserve-platform.onrender.com

### Database Hosting
- **Platform:** MongoDB Atlas
- **Type:** Cloud MongoDB
