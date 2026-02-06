# OmTrax CRM - Backend Documentation

## Overview
This document outlines the complete backend architecture for the OmTrax CRM system using **Node.js**, **Express.js**, and **MongoDB**.

---

## 📊 Database Schema Design

### 1. Users Collection
Stores all users (Admin and Salespersons)

```javascript
// users collection
{
  _id: ObjectId,
  username: String,          // Unique, required (e.g., "nimit", "anchal")
  password: String,          // Hashed password, required
  name: String,              // Full name (e.g., "Nimit Gupta")
  email: String,             // Unique, required
  phone: String,             // Optional
  role: String,              // Enum: "admin" | "salesperson"
  branch: ObjectId,          // Reference to Branch (required for salesperson, optional for admin)
  isActive: Boolean,         // Default: true
  profileImage: String,      // URL to profile image (optional)
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date
}

// Indexes
- username: unique
- email: unique
- role: 1
- branch: 1
```

### 2. Branches Collection
Stores branch/office locations

```javascript
// branches collection
{
  _id: ObjectId,
  name: String,              // Branch name (e.g., "Delhi", "Mumbai", "Bangalore")
  code: String,              // Unique code (e.g., "DEL", "MUM", "BLR")
  address: String,           // Full address
  city: String,
  state: String,
  pincode: String,
  phone: String,
  email: String,
  isActive: Boolean,         // Default: true
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- code: unique
- name: 1
```

### 3. Sales Entries Collection
Main collection for sales leads

```javascript
// salesEntries collection
{
  _id: ObjectId,
  
  // Company Information
  companyName: String,       // Required
  contactPerson: String,     // Required
  contactNumber: String,     // Required, 10 digits
  contactEmail: String,      // Required, valid email
  designation: String,       // Required (e.g., "HR Manager", "CEO")
  
  // Service Information
  requirement: String,       // Enum: "Relocation" | "HR" | "Real Estate"
  location: String,          // Target location for service
  
  // Status & Follow-up
  queryStatus: String,       // Enum: "Cold" | "Warm" | "Hot" | "Closed"
  remark: String,            // Latest remark
  nextFollowUpDate: Date,    // Next scheduled follow-up
  
  // Assignment
  salesPerson: ObjectId,     // Reference to User (salesperson)
  branch: ObjectId,          // Reference to Branch
  
  // Timestamps
  entryDate: Date,           // Date of entry creation
  lastUpdated: Date,
  closedDate: Date,          // Date when status changed to "Closed"
  
  // Metadata
  createdBy: ObjectId,       // Reference to User (who created - could be admin)
  updatedBy: ObjectId,       // Reference to User (last updated by)
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- salesPerson: 1
- branch: 1
- queryStatus: 1
- requirement: 1
- nextFollowUpDate: 1
- entryDate: -1
- companyName: "text", contactPerson: "text", location: "text" (text index for search)
```

### 4. Follow-Up History Collection
Stores all follow-up records for each sales entry

```javascript
// followUps collection
{
  _id: ObjectId,
  salesEntry: ObjectId,      // Reference to SalesEntry (required)
  
  // Follow-up Details
  remark: String,            // Required
  status: String,            // Status at time of follow-up: "Cold" | "Warm" | "Hot" | "Closed"
  nextFollowUpDate: Date,    // Next scheduled follow-up date
  
  // Who added
  addedBy: ObjectId,         // Reference to User
  addedByName: String,       // Denormalized for quick display
  
  // Timestamps
  followUpDate: Date,        // When this follow-up was recorded
  createdAt: Date
}

// Indexes
- salesEntry: 1
- addedBy: 1
- followUpDate: -1
```

### 5. Notifications Collection
Stores notifications for admin

```javascript
// notifications collection
{
  _id: ObjectId,
  
  // Notification Type
  type: String,              // Enum: "followup" | "reminder" | "new_entry"
  
  // Related Data
  salesEntry: ObjectId,      // Reference to SalesEntry
  companyName: String,       // Denormalized
  
  // For follow-up notifications
  salesPerson: ObjectId,     // Who triggered the notification
  salesPersonName: String,   // Denormalized
  remark: String,            // The remark added
  nextFollowUpDate: Date,
  
  // For reminders
  followUpDate: Date,        // The due date
  isOverdue: Boolean,
  
  // Target User
  forUser: ObjectId,         // User who should see this (admin or specific salesperson)
  forRole: String,           // "admin" | "salesperson" | "all"
  
  // Status
  isRead: Boolean,           // Default: false
  readAt: Date,
  
  createdAt: Date
}

// Indexes
- forUser: 1, isRead: 1
- type: 1
- createdAt: -1
```

---

## 📋 Field Requirements Summary

### Sales Entry Form - Required Fields

| Field | Type | Validation | Example |
|-------|------|------------|---------|
| companyName | String | Required, min 2 chars | "Tech Solutions Pvt Ltd" |
| contactPerson | String | Required, min 2 chars | "Vikram Mehta" |
| contactNumber | String | Required, 10 digits | "9876543210" |
| contactEmail | String | Required, valid email | "vikram@techsolutions.com" |
| designation | String | Required | "HR Manager" |
| requirement | String | Required, enum | "Relocation" |
| location | String | Required | "Mumbai" |
| remark | String | Optional | "Interested in services" |
| nextFollowUpDate | Date | Required | "2026-02-10" |
| queryStatus | String | Required, enum | "Hot" |

### Follow-Up Form - Required Fields

| Field | Type | Validation | Example |
|-------|------|------------|---------|
| remark | String | Required | "Follow-up call completed" |
| nextFollowUpDate | Date | Required | "2026-02-15" |
| status | String | Optional (keeps current if not provided) | "Warm" |

### User Registration - Required Fields

| Field | Type | Validation | Example |
|-------|------|------------|---------|
| username | String | Required, unique, alphanumeric | "anchal" |
| password | String | Required, min 6 chars | "hashed_password" |
| name | String | Required | "Anchal Kumar" |
| email | String | Required, unique, valid email | "anchal@omtrax.com" |
| role | String | Required, enum | "salesperson" |
| branch | ObjectId | Required for salesperson | "branch_id" |

---

## 🔗 API Endpoints

### Authentication
```
POST   /api/auth/login          - User login
POST   /api/auth/logout         - User logout
GET    /api/auth/me             - Get current user
POST   /api/auth/refresh        - Refresh token
```

### Users (Admin only)
```
GET    /api/users               - Get all users
GET    /api/users/:id           - Get user by ID
POST   /api/users               - Create new user
PUT    /api/users/:id           - Update user
DELETE /api/users/:id           - Delete/deactivate user
GET    /api/users/salespersons  - Get all salespersons
```

### Branches (Admin only)
```
GET    /api/branches            - Get all branches
GET    /api/branches/:id        - Get branch by ID
POST   /api/branches            - Create new branch
PUT    /api/branches/:id        - Update branch
DELETE /api/branches/:id        - Delete/deactivate branch
```

### Sales Entries
```
GET    /api/sales               - Get all entries (admin) / own entries (salesperson)
GET    /api/sales/:id           - Get entry by ID
POST   /api/sales               - Create new entry
PUT    /api/sales/:id           - Update entry (admin only for full edit)
DELETE /api/sales/:id           - Delete entry (admin only)

# Filtering & Search
GET    /api/sales?status=Hot&branch=xxx&salesPerson=xxx&requirement=xxx&search=xxx
GET    /api/sales?startDate=xxx&endDate=xxx
GET    /api/sales?page=1&limit=10&sort=-createdAt
```

### Follow-Ups
```
GET    /api/sales/:id/followups     - Get all follow-ups for an entry
POST   /api/sales/:id/followups     - Add new follow-up
GET    /api/followups/due           - Get due follow-ups for current user
GET    /api/followups/overdue       - Get overdue follow-ups
```

### Notifications
```
GET    /api/notifications           - Get notifications for current user
PUT    /api/notifications/:id/read  - Mark notification as read
PUT    /api/notifications/read-all  - Mark all as read
DELETE /api/notifications/:id       - Delete notification
```

### Dashboard & Analytics
```
GET    /api/dashboard/stats         - Get dashboard statistics
GET    /api/dashboard/stats/branch  - Get branch-wise stats
GET    /api/dashboard/stats/user    - Get user-wise stats (for salesperson)
GET    /api/analytics/trends        - Get trend data for charts
```

---

## 📤 Request/Response Examples

### Create Sales Entry
**Request:**
```json
POST /api/sales
{
  "companyName": "Tech Solutions Pvt Ltd",
  "contactPerson": "Vikram Mehta",
  "contactNumber": "9876543210",
  "contactEmail": "vikram@techsolutions.com",
  "designation": "HR Manager",
  "requirement": "Relocation",
  "location": "Mumbai",
  "remark": "Interested in employee relocation services",
  "nextFollowUpDate": "2026-02-10",
  "queryStatus": "Hot"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65abc123...",
    "companyName": "Tech Solutions Pvt Ltd",
    "contactPerson": "Vikram Mehta",
    "contactNumber": "9876543210",
    "contactEmail": "vikram@techsolutions.com",
    "designation": "HR Manager",
    "requirement": "Relocation",
    "location": "Mumbai",
    "remark": "Interested in employee relocation services",
    "nextFollowUpDate": "2026-02-10T00:00:00.000Z",
    "queryStatus": "Hot",
    "salesPerson": {
      "_id": "user_id",
      "name": "Anchal Kumar"
    },
    "branch": {
      "_id": "branch_id",
      "name": "Delhi"
    },
    "entryDate": "2026-02-05T00:00:00.000Z",
    "followUpHistory": [],
    "createdAt": "2026-02-05T10:30:00.000Z"
  }
}
```

### Add Follow-Up
**Request:**
```json
POST /api/sales/:id/followups
{
  "remark": "Follow-up call completed, client requested proposal",
  "nextFollowUpDate": "2026-02-15",
  "status": "Warm"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "followup_id",
    "salesEntry": "sales_entry_id",
    "remark": "Follow-up call completed, client requested proposal",
    "nextFollowUpDate": "2026-02-15T00:00:00.000Z",
    "status": "Warm",
    "addedBy": {
      "_id": "user_id",
      "name": "Anchal Kumar"
    },
    "followUpDate": "2026-02-05T00:00:00.000Z",
    "createdAt": "2026-02-05T14:20:00.000Z"
  },
  "message": "Follow-up added successfully"
}
```

### Get Dashboard Stats
**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byStatus": {
      "hot": 25,
      "warm": 45,
      "cold": 60,
      "closed": 20
    },
    "byBranch": {
      "Delhi": 50,
      "Mumbai": 45,
      "Bangalore": 35,
      "Hyderabad": 20
    },
    "byRequirement": {
      "Relocation": 70,
      "HR": 50,
      "Real Estate": 30
    },
    "bySalesPerson": {
      "Anchal Kumar": 40,
      "Manoj Kumar": 35,
      "Varun Arora": 38,
      "Sushil Kumar": 37
    },
    "dueToday": 12,
    "overdue": 5
  }
}
```

---

## 🔐 Authentication & Authorization

### JWT Token Structure
```javascript
{
  userId: "user_id",
  username: "anchal",
  name: "Anchal Kumar",
  role: "salesperson",
  branch: "branch_id",
  iat: timestamp,
  exp: timestamp
}
```

### Role-Based Access Control

| Action | Admin | Salesperson |
|--------|-------|-------------|
| View all entries | ✅ | ❌ |
| View own entries | ✅ | ✅ |
| Create entry | ✅ | ✅ |
| Edit any entry | ✅ | ❌ |
| Edit own entry | ✅ | ❌ (only via follow-up) |
| Delete entry | ✅ | ❌ |
| Add follow-up (any) | ✅ | ❌ |
| Add follow-up (own) | ✅ | ✅ |
| View all notifications | ✅ | ❌ |
| View own reminders | ✅ | ✅ |
| Manage users | ✅ | ❌ |
| Manage branches | ✅ | ❌ |

---

## 📁 Suggested Project Structure

```
omtrax-crm-backend/
├── src/
│   ├── config/
│   │   ├── database.js       # MongoDB connection
│   │   ├── jwt.js            # JWT configuration
│   │   └── constants.js      # App constants
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Branch.js
│   │   ├── SalesEntry.js
│   │   ├── FollowUp.js
│   │   └── Notification.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── branchController.js
│   │   ├── salesController.js
│   │   ├── followUpController.js
│   │   ├── notificationController.js
│   │   └── dashboardController.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── branchRoutes.js
│   │   ├── salesRoutes.js
│   │   ├── followUpRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── dashboardRoutes.js
│   │   └── index.js
│   │
│   ├── middleware/
│   │   ├── auth.js           # JWT verification
│   │   ├── roleCheck.js      # Role-based access
│   │   ├── validate.js       # Request validation
│   │   └── errorHandler.js   # Global error handler
│   │
│   ├── services/
│   │   ├── notificationService.js  # Create notifications
│   │   ├── reminderService.js      # Generate reminders (cron job)
│   │   └── emailService.js         # Email notifications (optional)
│   │
│   ├── utils/
│   │   ├── validators.js     # Input validation helpers
│   │   ├── helpers.js        # Utility functions
│   │   └── apiResponse.js    # Standardized responses
│   │
│   └── app.js                # Express app setup
│
├── .env
├── .env.example
├── package.json
└── server.js                 # Entry point
```

---

## 🔄 Data Relationships Diagram

```
┌─────────────┐       ┌─────────────┐
│   BRANCHES  │       │    USERS    │
├─────────────┤       ├─────────────┤
│ _id         │◄──────│ branch      │
│ name        │       │ _id         │
│ code        │       │ name        │
│ city        │       │ role        │
└─────────────┘       └──────┬──────┘
                             │
                             │ salesPerson
                             ▼
┌─────────────────────────────────────────┐
│              SALES ENTRIES              │
├─────────────────────────────────────────┤
│ _id                                     │
│ companyName, contactPerson, etc.        │
│ salesPerson ──────────────────────────► │ User
│ branch ───────────────────────────────► │ Branch
│ createdBy ────────────────────────────► │ User
└──────────────────┬──────────────────────┘
                   │
                   │ salesEntry
                   ▼
┌─────────────────────────────────────────┐
│              FOLLOW-UPS                 │
├─────────────────────────────────────────┤
│ _id                                     │
│ salesEntry ───────────────────────────► │ SalesEntry
│ remark, status, nextFollowUpDate        │
│ addedBy ──────────────────────────────► │ User
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│             NOTIFICATIONS               │
├─────────────────────────────────────────┤
│ _id                                     │
│ type (followup/reminder)                │
│ salesEntry ───────────────────────────► │ SalesEntry
│ salesPerson ──────────────────────────► │ User
│ forUser ──────────────────────────────► │ User
└─────────────────────────────────────────┘
```

---

## ⏰ Background Jobs (Cron)

### Daily Reminder Generation
Run every morning at 8:00 AM to create reminder notifications:

```javascript
// Pseudo code
async function generateDailyReminders() {
  const today = new Date().toISOString().split('T')[0];
  
  // Find all entries with follow-up due today or overdue
  const dueEntries = await SalesEntry.find({
    nextFollowUpDate: { $lte: today },
    queryStatus: { $ne: 'Closed' }
  }).populate('salesPerson');
  
  for (const entry of dueEntries) {
    // Create reminder for salesperson
    await Notification.create({
      type: 'reminder',
      salesEntry: entry._id,
      companyName: entry.companyName,
      followUpDate: entry.nextFollowUpDate,
      isOverdue: entry.nextFollowUpDate < today,
      forUser: entry.salesPerson._id,
      forRole: 'salesperson'
    });
    
    // Create reminder for admin
    await Notification.create({
      type: 'reminder',
      salesEntry: entry._id,
      companyName: entry.companyName,
      salesPerson: entry.salesPerson._id,
      salesPersonName: entry.salesPerson.name,
      followUpDate: entry.nextFollowUpDate,
      isOverdue: entry.nextFollowUpDate < today,
      forRole: 'admin'
    });
  }
}
```

---

## 🛠️ Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/omtrax_crm

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=http://localhost:5173

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

---

## 📝 Summary of Collections & Field Counts

| Collection | Total Fields | Required Fields |
|------------|--------------|-----------------|
| Users | 12 | 6 |
| Branches | 10 | 3 |
| Sales Entries | 18 | 12 |
| Follow-Ups | 8 | 4 |
| Notifications | 14 | 5 |

---

## 🚀 Next Steps

1. Initialize Node.js project with Express
2. Set up MongoDB connection with Mongoose
3. Create models with proper validation
4. Implement authentication with JWT
5. Build CRUD APIs for each resource
6. Add role-based middleware
7. Implement notification system
8. Set up cron job for daily reminders
9. Add input validation and error handling
10. Test all endpoints with Postman
11. Connect frontend to backend APIs

---

*Document Version: 1.0*
*Created: February 5, 2026*
*For: OmTrax CRM System*
