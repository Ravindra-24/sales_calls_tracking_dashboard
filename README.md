# LeadWatch - Admin Dashboard

A React-based admin dashboard for managing sales calls, teams, and organizations. Built with React, TypeScript, Vite, and Firebase.

## Tech Stack

- **Framework:** React 19
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** CSS with custom properties
- **Routing:** React Router DOM v7
- **Authentication:** Firebase Auth
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Linting:** Oxlint

## Features

- 🔐 Secure authentication with Firebase Auth
- 👥 Organization and team management
- 📞 Call history and management
- 📊 Statistics and analytics dashboard
- 👤 Role-based access control (Owner, Manager, Rep)
- 📱 Responsive design
- 🎨 Modern glass-morphism UI

## Project Structure

```
Tracking_Dashboard/
├── src/
│   ├── api/
│   │   └── client.ts              # Axios API client with auth interceptors
│   ├── assets/                    # Images and static assets
│   ├── components/
│   │   └── Layout.tsx             # Main layout wrapper
│   ├── config/
│   │   └── firebase.ts            # Firebase configuration
│   ├── context/
│   │   └── auth.tsx               # Authentication context provider
│   ├── pages/
│   │   ├── Dashboard.tsx          # Main dashboard with statistics
│   │   ├── CallHistory.tsx        # Call history and management
│   │   ├── Team.tsx               # Team/user management
│   │   └── Login.tsx              # Login page
│   ├── styles/
│   │   └── index.css              # Global styles and CSS variables
│   ├── types/
│   │   └── api.ts                 # TypeScript interfaces
│   ├── App.tsx                    # Main app component with routing
│   └── main.tsx                   # Entry point
├── public/                        # Public assets
├── .env                           # Environment variables (not committed)
├── .env.example                   # Environment variables template
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project with Authentication and Firestore enabled
- Backend API running (see backend README)

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5001/sales-calls-tracking/asia-south1/api

# Firebase Configuration (get from Firebase Console)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Emulator Configuration (Development only - optional)
VITE_AUTH_EMULATOR_HOST=localhost:9099
```

3. **Get Firebase configuration:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Copy the Firebase SDK configuration

## Running the Application

### Development Mode
```bash
npm run dev
```

The dashboard will be available at http://localhost:5173

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Connecting to Backend

### Development (with Emulators)
When running locally with Firebase emulators, the dashboard connects to:
- **Backend API:** http://localhost:5001
- **Auth Emulator:** http://localhost:9099

Make sure the backend emulators are running:
```bash
cd GCF/functions
npm run serve
```

### Production
Update `.env` with your production API URL:
```env
VITE_API_BASE_URL=https://asia-south1-sales-calls-tracking.cloudfunctions.net/api
```

Remove or comment out the emulator configuration:
```env
# VITE_AUTH_EMULATOR_HOST=localhost:9099
```

## User Roles & Permissions

### Owner
- Full access to all features
- Can create and manage organizations
- Can invite managers and reps
- Can view all team statistics
- Can manage user roles and permissions

### Manager
- Can view all team calls and statistics
- Can invite reps to the organization
- Can manage rep accounts
- Cannot invite other managers
- Cannot modify owner account

### Rep
- Can only view their own calls
- Can create and edit their own call records
- Cannot access team management
- Cannot view other users' data

## Pages

### Login Page (`/`)
- Email/password authentication
- Role-based access (only owners and managers can access dashboard)
- Automatic token refresh

### Dashboard (`/dashboard`)
- Overview statistics
- Call metrics and trends
- Team performance indicators
- Recent activity feed

### Call History (`/calls`)
- View all calls (filtered by role)
- Create new call records
- Edit existing calls
- Delete calls
- Search and filter functionality

### Team Management (`/team`)
- List all team members
- Invite new members (owner/manager only)
- Update user roles (owner/manager only)
- Disable/enable user accounts
- View user statistics

## Authentication Flow

1. User logs in with email and password
2. Firebase Auth verifies credentials
3. Backend validates custom claims (orgId, role)
4. Dashboard stores auth state in context
5. API requests include Bearer token in Authorization header
6. Backend validates token and custom claims for each request

## API Integration

The dashboard uses Axios for API calls with the following features:
- Automatic token injection via request interceptor
- Error handling and user-friendly error messages
- Base URL configured via environment variables
- CORS support for development

### Example API Call
```typescript
import { api } from '../api/client';

// GET request with auth
const calls = await api.get('/calls');

// POST request with auth
const newCall = await api.post('/calls', {
  customerName: 'John Doe',
  customerPhone: '+1234567890',
  type: 'outbound',
  duration: 300
});
```

## Development Workflow

1. **Start backend emulators:**
```bash
cd GCF/functions
npm run serve
```

2. **Create admin user (first time only):**
```bash
curl -X POST http://localhost:5001/sales-calls-tracking/asia-south1/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "name": "Admin User",
    "orgName": "My Organization"
  }'
```

3. **Start dashboard:**
```bash
npm run dev
```

4. **Login:**
   - Open http://localhost:5173
   - Use the credentials from step 2

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_BASE_URL` | Backend API URL | Yes | - |
| `VITE_FIREBASE_API_KEY` | Firebase API key | Yes | - |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes | - |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Yes | - |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes | - |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes | - |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | Yes | - |
| `VITE_AUTH_EMULATOR_HOST` | Auth emulator host (dev only) | No | - |

## Troubleshooting

### "Sign-in failed" error
- Ensure Firebase Auth emulator is running (if in development)
- Check that the user exists in Firebase Auth
- Verify Firebase configuration in `.env`
- Check browser console for detailed error messages

### API connection errors
- Verify backend is running on the correct port
- Check `VITE_API_BASE_URL` in `.env`
- Ensure CORS is configured correctly in backend
- Check network tab in browser DevTools

### Emulator not connecting
- Ensure emulators are running: `npm run serve` (in GCF/functions)
- Check `VITE_AUTH_EMULATOR_HOST` is set correctly
- Verify emulator ports in `firebase.json`

### Port already in use
Change the port in `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 3000, // Change to any available port
  },
})
```

## Building for Production

1. **Update environment variables:**
   - Set `VITE_API_BASE_URL` to production API URL
   - Remove or comment out emulator configuration
   - Ensure all Firebase config values are correct

2. **Build the application:**
```bash
npm run build
```

3. **Preview the build:**
```bash
npm run preview
```

4. **Deploy:**
   - Deploy the `dist` folder to your hosting service (Firebase Hosting, Vercel, Netlify, etc.)

## Security Considerations

- Never commit `.env` file to version control
- Use environment variables for all sensitive configuration
- Enable HTTPS in production
- Implement proper CORS policies in production
- Regularly update dependencies
- Use Firebase Security Rules to protect data

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Private - All rights reserved
