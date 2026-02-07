from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
from auth_service import verify_firebase_token, is_super_admin, SUPER_ADMINS

load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL")
client = MongoClient(MONGO_URL)
db = client.food_cart_db

# Models
class UserProfile(BaseModel):
    name: str

class UserUpdate(BaseModel):
    name: str
    isActive: bool

# Helper function to verify token
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    try:
        decoded_token = verify_firebase_token(token)
        phone_number = decoded_token.get("phone_number")
        if not phone_number:
            raise HTTPException(status_code=401, detail="Phone number not found in token")
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Backend is running"}

# Authentication endpoints
@app.post("/api/auth/verify-token")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """Verify Firebase token and check/create user in MongoDB"""
    phone_number = current_user.get("phone_number")
    uid = current_user.get("uid")
    
    # Check if user exists in MongoDB
    user = db.users.find_one({"phoneNumber": phone_number})
    
    # Check if super admin
    is_admin = is_super_admin(phone_number)
    
    if not user:
        # Create new user
        new_user = {
            "phoneNumber": phone_number,
            "firebaseUid": uid,
            "name": "",
            "isActive": True,
            "isSuperAdmin": is_admin,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "lastLogin": datetime.utcnow()
        }
        result = db.users.insert_one(new_user)
        user = db.users.find_one({"_id": result.inserted_id})
    else:
        # Update last login and super admin status
        db.users.update_one(
            {"phoneNumber": phone_number},
            {"$set": {
                "lastLogin": datetime.utcnow(),
                "isSuperAdmin": is_admin
            }}
        )
        user = db.users.find_one({"phoneNumber": phone_number})
    
    # Check if user is active (super admins always have access)
    if not user.get("isActive", True) and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Your account has been deactivated. Please contact support."
        )
    
    # Return user data
    user["_id"] = str(user["_id"])
    return {
        "success": True,
        "user": {
            "phoneNumber": user["phoneNumber"],
            "name": user.get("name", ""),
            "isActive": user.get("isActive", True),
            "isSuperAdmin": is_admin
        }
    }

# User profile endpoints
@app.get("/api/users/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get user profile"""
    phone_number = current_user.get("phone_number")
    user = db.users.find_one({"phoneNumber": phone_number})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["_id"] = str(user["_id"])
    return {"user": user}

@app.put("/api/users/profile")
async def update_profile(profile: UserProfile, current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    phone_number = current_user.get("phone_number")
    
    result = db.users.update_one(
        {"phoneNumber": phone_number},
        {"$set": {"name": profile.name, "updatedAt": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "Profile updated successfully"}

# Super Admin endpoints
@app.get("/api/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users (Super Admin only)"""
    phone_number = current_user.get("phone_number")
    
    if not is_super_admin(phone_number):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all users except super admins
    users = list(db.users.find(
        {"phoneNumber": {"$nin": SUPER_ADMINS}},
        {"_id": 0}
    ))
    
    return {"users": users}

@app.get("/api/admin/users/search")
async def search_users(query: str, current_user: dict = Depends(get_current_user)):
    """Search users by phone number (Super Admin only)"""
    phone_number = current_user.get("phone_number")
    
    if not is_super_admin(phone_number):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Search users by phone number (regex search)
    users = list(db.users.find(
        {
            "phoneNumber": {"$regex": query, "$nin": SUPER_ADMINS}
        },
        {"_id": 0}
    ))
    
    return {"users": users}

@app.put("/api/admin/users/{user_phone}")
async def update_user(user_phone: str, update: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update user (Super Admin only)"""
    phone_number = current_user.get("phone_number")
    
    if not is_super_admin(phone_number):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Don't allow updating super admins
    if user_phone in SUPER_ADMINS:
        raise HTTPException(status_code=400, detail="Cannot edit super admin")
    
    result = db.users.update_one(
        {"phoneNumber": user_phone},
        {"$set": {
            "name": update.name,
            "isActive": update.isActive,
            "updatedAt": datetime.utcnow()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "User updated successfully"}