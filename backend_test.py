#!/usr/bin/env python3
"""
Backend Test Suite for Tap-Bill Food Cart App - Development Mode Authentication
Tests the dev mode authentication endpoints and admin functionality.
"""

import requests
import json
import sys
from typing import Dict, Any

# Backend URL from frontend/.env
BACKEND_URL = "https://food-cart-pos.preview.emergentagent.com"

class BackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.dev_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
    
    def test_health_check(self) -> bool:
        """Test GET /api/health endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/health")
            
            if response.status_code != 200:
                self.log_test("Health Check Endpoint", False, f"Status code: {response.status_code}")
                return False
            
            data = response.json()
            
            # Check required fields
            required_fields = ["status", "devMode", "devOtp"]
            for field in required_fields:
                if field not in data:
                    self.log_test("Health Check Endpoint", False, f"Missing field: {field}")
                    return False
            
            # Check values
            if data["status"] != "healthy":
                self.log_test("Health Check Endpoint", False, f"Status is not 'healthy': {data['status']}")
                return False
                
            if data["devMode"] != True:
                self.log_test("Health Check Endpoint", False, f"devMode is not True: {data['devMode']}")
                return False
                
            if data["devOtp"] != "666666":
                self.log_test("Health Check Endpoint", False, f"devOtp is not '666666': {data['devOtp']}")
                return False
            
            self.log_test("Health Check Endpoint", True, f"Response: {data}")
            return True
            
        except Exception as e:
            self.log_test("Health Check Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_dev_login_super_admin(self) -> bool:
        """Test dev login with super admin phone number"""
        try:
            payload = {
                "phoneNumber": "9899273448",
                "otp": "666666"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/auth/dev-login",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                self.log_test("Dev Login - Super Admin", False, f"Status code: {response.status_code}, Response: {response.text}")
                return False
            
            data = response.json()
            
            # Check required fields
            required_fields = ["success", "devToken", "user"]
            for field in required_fields:
                if field not in data:
                    self.log_test("Dev Login - Super Admin", False, f"Missing field: {field}")
                    return False
            
            # Check values
            if data["success"] != True:
                self.log_test("Dev Login - Super Admin", False, f"Success is not True: {data['success']}")
                return False
            
            expected_token = "dev-token-+919899273448"
            if data["devToken"] != expected_token:
                self.log_test("Dev Login - Super Admin", False, f"Token mismatch. Expected: {expected_token}, Got: {data['devToken']}")
                return False
            
            # Check user data
            user = data["user"]
            if user["phoneNumber"] != "+919899273448":
                self.log_test("Dev Login - Super Admin", False, f"Phone number mismatch: {user['phoneNumber']}")
                return False
                
            if user["isSuperAdmin"] != True:
                self.log_test("Dev Login - Super Admin", False, f"isSuperAdmin should be True: {user['isSuperAdmin']}")
                return False
            
            # Store token for subsequent tests
            self.dev_token = data["devToken"]
            
            self.log_test("Dev Login - Super Admin", True, f"Token: {data['devToken']}, User: {user['phoneNumber']}")
            return True
            
        except Exception as e:
            self.log_test("Dev Login - Super Admin", False, f"Exception: {str(e)}")
            return False
    
    def test_dev_login_regular_user(self) -> bool:
        """Test dev login with regular user phone number"""
        try:
            payload = {
                "phoneNumber": "1234567890",
                "otp": "666666"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/auth/dev-login",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                self.log_test("Dev Login - Regular User", False, f"Status code: {response.status_code}, Response: {response.text}")
                return False
            
            data = response.json()
            
            # Check required fields
            if not all(field in data for field in ["success", "devToken", "user"]):
                self.log_test("Dev Login - Regular User", False, "Missing required fields")
                return False
            
            # Check values
            if data["success"] != True:
                self.log_test("Dev Login - Regular User", False, f"Success is not True: {data['success']}")
                return False
            
            expected_token = "dev-token-+911234567890"
            if data["devToken"] != expected_token:
                self.log_test("Dev Login - Regular User", False, f"Token mismatch. Expected: {expected_token}, Got: {data['devToken']}")
                return False
            
            # Check user data
            user = data["user"]
            if user["phoneNumber"] != "+911234567890":
                self.log_test("Dev Login - Regular User", False, f"Phone number mismatch: {user['phoneNumber']}")
                return False
                
            if user["isSuperAdmin"] != False:
                self.log_test("Dev Login - Regular User", False, f"isSuperAdmin should be False: {user['isSuperAdmin']}")
                return False
            
            self.log_test("Dev Login - Regular User", True, f"Token: {data['devToken']}, User: {user['phoneNumber']}")
            return True
            
        except Exception as e:
            self.log_test("Dev Login - Regular User", False, f"Exception: {str(e)}")
            return False
    
    def test_dev_login_invalid_otp(self) -> bool:
        """Test dev login with invalid OTP"""
        try:
            payload = {
                "phoneNumber": "9899273448",
                "otp": "123456"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/auth/dev-login",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            # Should return 401 for invalid OTP
            if response.status_code != 401:
                self.log_test("Dev Login - Invalid OTP", False, f"Expected 401, got {response.status_code}")
                return False
            
            self.log_test("Dev Login - Invalid OTP", True, "Correctly rejected invalid OTP with 401")
            return True
            
        except Exception as e:
            self.log_test("Dev Login - Invalid OTP", False, f"Exception: {str(e)}")
            return False
    
    def test_verify_dev_token(self) -> bool:
        """Test token verification with dev token"""
        if not self.dev_token:
            self.log_test("Verify Dev Token", False, "No dev token available from previous test")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.dev_token}",
                "Content-Type": "application/json"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/auth/verify-token",
                headers=headers
            )
            
            if response.status_code != 200:
                self.log_test("Verify Dev Token", False, f"Status code: {response.status_code}, Response: {response.text}")
                return False
            
            data = response.json()
            
            # Check required fields
            if not all(field in data for field in ["success", "user"]):
                self.log_test("Verify Dev Token", False, "Missing required fields")
                return False
            
            # Check values
            if data["success"] != True:
                self.log_test("Verify Dev Token", False, f"Success is not True: {data['success']}")
                return False
            
            user = data["user"]
            if user["phoneNumber"] != "+919899273448":
                self.log_test("Verify Dev Token", False, f"Phone number mismatch: {user['phoneNumber']}")
                return False
            
            self.log_test("Verify Dev Token", True, f"Token verified for user: {user['phoneNumber']}")
            return True
            
        except Exception as e:
            self.log_test("Verify Dev Token", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_users_endpoint(self) -> bool:
        """Test admin users endpoint with dev token"""
        if not self.dev_token:
            self.log_test("Admin Users Endpoint", False, "No dev token available from previous test")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.dev_token}",
                "Content-Type": "application/json"
            }
            
            response = self.session.get(
                f"{self.base_url}/api/admin/users",
                headers=headers
            )
            
            if response.status_code != 200:
                self.log_test("Admin Users Endpoint", False, f"Status code: {response.status_code}, Response: {response.text}")
                return False
            
            data = response.json()
            
            # Check required fields
            if "users" not in data:
                self.log_test("Admin Users Endpoint", False, "Missing 'users' field")
                return False
            
            # Should return a list (even if empty)
            if not isinstance(data["users"], list):
                self.log_test("Admin Users Endpoint", False, f"Users field is not a list: {type(data['users'])}")
                return False
            
            self.log_test("Admin Users Endpoint", True, f"Returned {len(data['users'])} users")
            return True
            
        except Exception as e:
            self.log_test("Admin Users Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_access_with_regular_token(self) -> bool:
        """Test admin endpoint access with regular user token (should fail)"""
        try:
            # First get a regular user token
            payload = {
                "phoneNumber": "1234567890",
                "otp": "666666"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/auth/dev-login",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                self.log_test("Admin Access - Regular User", False, "Failed to get regular user token")
                return False
            
            regular_token = response.json()["devToken"]
            
            # Try to access admin endpoint
            headers = {
                "Authorization": f"Bearer {regular_token}",
                "Content-Type": "application/json"
            }
            
            response = self.session.get(
                f"{self.base_url}/api/admin/users",
                headers=headers
            )
            
            # Should return 403 for non-admin user
            if response.status_code != 403:
                self.log_test("Admin Access - Regular User", False, f"Expected 403, got {response.status_code}")
                return False
            
            self.log_test("Admin Access - Regular User", True, "Correctly denied access with 403")
            return True
            
        except Exception as e:
            self.log_test("Admin Access - Regular User", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🧪 Starting Backend Tests for Development Mode Authentication")
        print(f"🔗 Backend URL: {self.base_url}")
        print("=" * 60)
        
        tests = [
            self.test_health_check,
            self.test_dev_login_super_admin,
            self.test_dev_login_regular_user,
            self.test_dev_login_invalid_otp,
            self.test_verify_dev_token,
            self.test_admin_users_endpoint,
            self.test_admin_access_with_regular_token
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            print()  # Add spacing between tests
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {total - passed} tests failed")
            return False
    
    def get_summary(self):
        """Get test summary"""
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        summary = {
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": f"{(passed/total)*100:.1f}%" if total > 0 else "0%",
            "results": self.test_results
        }
        
        return summary

def main():
    """Main test runner"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Print detailed summary
    summary = tester.get_summary()
    print(f"\n📋 Detailed Summary:")
    print(f"   Total Tests: {summary['total_tests']}")
    print(f"   Passed: {summary['passed']}")
    print(f"   Failed: {summary['failed']}")
    print(f"   Success Rate: {summary['success_rate']}")
    
    if not success:
        print("\n❌ Failed Tests:")
        for result in summary['results']:
            if not result['success']:
                print(f"   - {result['test']}: {result['details']}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())