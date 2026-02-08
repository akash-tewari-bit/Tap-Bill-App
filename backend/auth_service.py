import firebase_admin
from firebase_admin import credentials, auth
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Check if development mode is enabled
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"
DEV_OTP = "666666"

# Initialize Firebase Admin only if not in dev mode
firebase_app = None
if not DEV_MODE:
    try:
        cred = credentials.Certificate('firebase-admin.json')
        firebase_app = firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin initialized successfully")
    except Exception as e:
        print(f"⚠️ Firebase Admin initialization failed: {e}")
        print("💡 Set DEV_MODE=true in .env for local development without Firebase")
else:
    print("🔧 DEV MODE ENABLED - Firebase authentication bypassed")
    print(f"📱 Use OTP: {DEV_OTP} for any phone number")

# Super admin list
SUPER_ADMINS = ["+919899273448"]  # Can be expanded later

def verify_firebase_token(id_token: str) -> dict:
    """Verify Firebase ID token and return decoded token"""
    # In dev mode, the token is actually the phone number
    if DEV_MODE:
        # Token format in dev mode: "dev-token-{phone_number}"
        if id_token.startswith("dev-token-"):
            phone_number = id_token.replace("dev-token-", "")
            return {
                "phone_number": phone_number,
                "uid": f"dev-uid-{phone_number}"
            }
        raise Exception("Invalid dev token format")
    
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        raise Exception(f"Invalid token: {str(e)}")

def is_super_admin(phone_number: str) -> bool:
    """Check if phone number is a super admin"""
    return phone_number in SUPER_ADMINS

def get_user_by_phone(phone_number: str):
    """Get Firebase user by phone number"""
    try:
        user = auth.get_user_by_phone_number(phone_number)
        return user
    except auth.UserNotFoundError:
        return None
    except Exception as e:
        raise Exception(f"Error fetching user: {str(e)}")
