# Firebase Setup Instructions

## Quick Start - Development Mode

For **local development** without Firebase setup, you can use **Dev Mode**:

1. Set in `backend/.env`:
   ```
   DEV_MODE=true
   ```

2. Use OTP `666666` for any phone number
3. No Firebase credentials required!

This is perfect for testing the app locally without setting up Firebase billing.

---

## Production Setup (Firebase)

For production deployment, you'll need to set up Firebase:

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

### 5. Disable Dev Mode for Production

In `backend/.env`, set:
```
DEV_MODE=false
```

## Super Admin Configuration

Edit `backend/auth_service.py` to add super admin phone numbers:

```python
SUPER_ADMINS = [
    "+919899273448",  # Add your numbers here with country code
    "+91XXXXXXXXXX",
]
```

## Environment Variables

### Backend (`backend/.env`)

```
MONGO_URL=mongodb://localhost:27017
DEV_MODE=true   # Set to 'false' for production
```

### Frontend (`frontend/.env`)

```
EXPO_PUBLIC_BACKEND_URL=http://<YOUR_IP>:8001
```

Replace `<YOUR_IP>` with your computer's local IP address (not `localhost`) for mobile testing.

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
- **Disable DEV_MODE** before deploying to production
- Set up Firebase security rules appropriately
