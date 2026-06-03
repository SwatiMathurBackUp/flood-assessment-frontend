# Flood Damage Assessment PWA

A progressive web application for conducting and managing flood damage assessments across chicken farms in Madison County, NC. Built with React + Vite (frontend) and .NET 10 (backend), with offline-first capabilities using IndexedDB and SQLite.

## 🎯 Project Overview

This application enables field assessors to:
- Conduct real-time farm assessments with GPS location tracking
- Capture photos of damage and infrastructure
- Store data locally for offline work
- Sync assessments to backend when back online
- Generate PDF reports
- Track assessment progress through workflow states

**Key Users:**
- **Assessors**: Conduct field assessments, save drafts, submit for review
- **Managers**: Monitor team progress, view all assessments, download reports

---

## 🏗️ Architecture

### Frontend Stack
- **React 18** + Vite (fast dev server)
- **Tailwind CSS** (styling)
- **React Router** (navigation)
- **Leaflet** (map visualization)
- **jsPDF + html2canvas** (PDF generation)
- **IndexedDB** (offline storage)
- **JWT** (authentication)

### Backend Stack
- **.NET 10** with Entity Framework Core
- **SQLite** (production database)
- **JWT Bearer Auth** (token-based security)
- **CORS** (cross-origin requests)
- **Cloudinary** (image storage - future)

### Data Flow
```
Frontend (React) ↔ IndexedDB ↔ Backend API (.NET) ↔ SQLite Database
                    (Offline)    (Online Sync)      (Persistence)
```

---

## 📋 Features

### ✅ Completed
- **User Authentication**: PIN-based login with JWT tokens (8hr expiry)
- **Farm Assignment Management**: View assigned farms with status tracking
- **Assessment Form**: Comprehensive field form with:
  - GPS location capture with reverse geocoding
  - Condition assessment (Good/Moderate/Bad)
  - Photo capture and storage
  - Free-text field notes
  - Draft saving & submission
- **Offline-First Sync**: 
  - Save locally when offline
  - Queue syncs for later
  - Automatic sync on reconnection
  - Pending sync status visibility
- **Dashboard Analytics**:
  - Assessment statistics cards
  - Condition breakdown pie chart
  - Farm status distribution
  - Team assessment view (Manager only)
- **Map Visualization**: Color-coded pins by farm status/condition
- **PDF Generation**: Download individual or full assessments
- **Role-Based Access Control**: Manager vs Assessor permissions
- **Responsive Design**: Mobile-first UI for field use

### 🔮 Future Enhancements
- Cloudinary integration for image upload
- Advanced filtering & search
- Batch operations for multiple farms
- Real-time notifications
- Historical assessment tracking
- Export to CSV/Excel
- Mobile app packaging (Capacitor)
- Backend deployment to production
- Database backups & recovery
- Assessment review workflow
- Insurance integration

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (frontend)
- .NET 10 SDK (backend)
- Git

### Frontend Setup
```bash
cd flood-assessment-frontend
npm install
npm run dev
# Open http://localhost:5173
```

### Backend Setup
```bash
cd flood-assessment-backend/FloodAssessment.API
dotnet restore
dotnet ef database update
dotnet run
# API runs on https://localhost:5167
```

### Default Credentials
| User | PIN | Role |
|------|-----|------|
| Admin Manager | 1234 | Manager |
| John Smith | 1111 | Assessor |
| Sarah Johnson | 2222 | Assessor |
| Mike Davis | 3333 | Assessor |

---

## 📁 Project Structure

```
flood-assessment-frontend/
├── src/
│   ├── components/
│   │   ├── Auth/Login.jsx
│   │   ├── Layout/(Sidebar, Layout, OnlineStatus)
│   │   ├── Dashboard/
│   │   ├── Farms/(AssignedFarms, MapView)
│   │   └── AssessmentForm.jsx
│   ├── lib/
│   │   ├── auth.js (JWT storage)
│   │   ├── api.js (HTTP + offline fallback)
│   │   ├── db.js (IndexedDB schema & operations)
│   │   └── pdf.js (PDF generation)
│   ├── hooks/useGeolocation.js
│   └── App.jsx (router)

flood-assessment-backend/FloodAssessment.API/
├── Models/(User, Assessment, FarmAssignment, Photo)
├── Data/
│   ├── AppDbContext.cs
│   └── DataSeeder.cs
├── Services/(AuthService, FarmService, AssessmentService)
├── Controllers/(Auth, Farm, Assessment)
├── DTOs/(Request/Response models)
└── Program.cs (DI, middleware, CORS)
```

---

## 🔑 Key Design Patterns

### 1. **Service Layer Architecture**
- Controllers delegate to services
- Services handle business logic
- Loose coupling, easy to test

### 2. **Repository Pattern** (via EF Core)
- DbContext acts as repository
- LINQ queries encapsulated
- Data access abstraction

### 3. **DTO Pattern**
- Input/Output data transfer
- Validation at API boundary
- Decouples models from API

### 4. **Offline-First Strategy**
- IndexedDB as primary store
- API as fallback/sync target
- Queue pending operations
- Sync on reconnection

### 5. **JWT Bearer Authentication**
- Stateless token-based auth
- 8-hour token expiry
- Claims-based authorization

---

## 🗄️ Database Schema

### Users
```sql
Id (PK) | Name | PinHash | Role | CreatedAt
```

### FarmAssignments
```sql
Id (PK) | FarmName | OwnerName | Address | Lat/Lng | EstimatedChickens 
Status | AssignedToUserId (FK) | AssessmentId (FK) | CreatedAt
```

### Assessments
```sql
Id (PK) | ClientId (UK) | AssessorName | Address | Lat/Lng | Condition 
ChickenCount | Notes | CreatedAt | SyncedAt | UserId (FK)
```

### Photos
```sql
Id (PK) | CloudinaryUrl | Filename | CapturedAt | AssessmentId (FK)
```

---

## 🔐 Security Considerations

1. **Authentication**: PIN hashed with BCrypt (11 rounds)
2. **Authorization**: Role-based access (Manager vs Assessor)
3. **API Security**:
   - CORS configured for specific origins
   - JWT token validation on protected routes
   - Claim-based authorization checks
4. **Data Privacy**:
   - Assessment filtered by user role
   - Managers see all, assessors see own only
5. **Client-side**: localStorage stores JWT (consider secure storage in production)

---

## 📊 State Management

### Frontend
- **React State**: Form, UI state, auth state
- **IndexedDB**: Persistent offline data
- **localStorage**: Auth tokens, user preferences

### Backend
- **SQLite**: Authoritative data store
- **EF Core DbContext**: ORM mapping

---

## 🧪 Testing Scenarios

### Scenario 1: Online Submission
1. Login → View farms → Start assessment
2. Fill form (GPS, condition, photos) → Submit
3. Data syncs immediately → Farm status = Completed

### Scenario 2: Offline Draft
1. Disable internet → Fill form → Save as Draft
2. Farm shows "InProgress" 
3. Re-enable internet → Sync button appears → Click Sync
4. Data uploads → Farm status = Completed

### Scenario 3: Manager View
1. Login as Admin Manager (1234)
2. See "Team Assessments" + all farms
3. Filter by assessor
4. Download PDF of all assessments

---

## 🐛 Known Issues & Workarounds

| Issue | Cause | Workaround |
|-------|-------|-----------|
| Condition not updating | Stale closure in state | Fixed: Updated condition button handler |
| Form loads wrong data | Address mismatch | Fixed: Use farmId instead of address |
| Assessment not syncing | Offline flag not set | Fixed: Check navigator.onLine |

---

## 📈 Performance Optimizations

- Code splitting with React.lazy (future)
- Image compression before upload
- IndexedDB indexing on farmId, syncStatus
- Efficient re-renders with memo/useMemo (future)
- API request deduplication (future)

---

## 🚢 Deployment

### Frontend
```bash
vercel login --github
vercel --prod
```
Live: https://flood-assessment-frontend-nine.vercel.app

### Backend (Ready for deployment)
- Railway, Heroku, or self-hosted server
- Requires environment variables: JWT key, CORS origins, Cloudinary credentials
- SQLite suitable for small teams; upgrade to PostgreSQL for production

---

## 📝 License & Credits

Built as a flood recovery assessment tool for Madison County, NC farmers.

**Tech Stack:** React, Vite, Tailwind, .NET 10, Entity Framework, SQLite, Leaflet, jsPDF

---

## 📞 Support & Questions

For issues or questions:
1. Check browser console (DevTools → Console)
2. Check backend logs (terminal where `dotnet run` is running)
3. Verify database: `sqlite3 floodassessment.db`
4. Check network requests (DevTools → Network)
