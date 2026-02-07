import firebase_admin
from firebase_admin import credentials, auth
from datetime import datetime
import os

# Initialize Firebase Admin
cred = credentials.Certificate('firebase-admin.json')
firebase_app = firebase_admin.initialize_app(cred)

# Super admin list
SUPER_ADMINS = ["+919899273448"]  # Can be expanded later

def verify_firebase_token(id_token: str) -> dict:
    """Verify Firebase ID token and return decoded token"""
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
