# Firebase Setup Instructions

## Required Firebase Credentials

This application requires Firebase credentials for authentication. Follow these steps to set up:

### 1. Firebase Service Account (Backend)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** (gear icon) → **Service Accounts**
4. Click **"Generate New Private Key"**
5. Save the downloaded JSON file as `backend/firebase-admin.json`

**IMPORTANT:** Never commit this file to version control. It's already in `.gitignore`.

### 2. Firebase Web Config (Frontend)

The Firebase web configuration is already set in `frontend/config/firebase.ts`. If you need to use your own Firebase project:

1. Go to **Project Settings** → **Your apps**
2. Click the **Web** icon (`</>`)
3. Register your app
4. Copy the configuration object
5. Update `frontend/config/firebase.ts` with your credentials

### 3. Enable Phone Authentication

1. In Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Phone** authentication
3. Click **Save**

### 4. Upgrade to Blaze Plan

Firebase Phone Authentication requires the Blaze (Pay-as-you-go) plan:

1. Go to **Usage and billing** → **Modify Plan**
2. Select **Blaze (Pay as you go)**
3. Add a credit card

**Cost:** First 10,000 verifications/month are FREE

### 5. Super Admin Configuration

Edit `backend/auth_service.py` to add super admin phone numbers:

```python
SUPER_ADMINS = [
    "+919899273448",  # Add your numbers here with country code
    "+91XXXXXXXXXX",
]
```

## Environment Variables

Make sure these environment variables are set in `backend/.env`:

```
MONGO_URL=mongodb://localhost:27017
```

Frontend environment variables are in `frontend/.env`:

```
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

## Running the Application

### Backend
```bash
cd backend
pip install -r requirements.txt
python server.py
```

### Frontend
```bash
cd frontend
yarn install
yarn start
```

## Security Notes

- **Never commit** `firebase-admin.json` to git
- **Never commit** `.env` files with sensitive data
- Keep your Firebase API keys secure
- Set up Firebase security rules appropriately
