#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Build a mobile app for small food carts using Expo (React Native) with FastAPI backend.
  Features:
  - Tabbed Navigation: Dashboard, Orders, Reports, Settings (Users tab for Super Admin only)
  - Authentication: Phone OTP via Firebase (with Dev Mode for local testing)
  - Super Admin: Phone 9899273448 can manage other users
  - Dashboard: Today's orders and revenue
  - Orders: List with date filter, Create Order page
  - Reports: Table view with CSV export
  - Settings: Business info and menu items management
  - Branding: App named "Tap-Bill" with logo

backend:
  - task: "Health Check Endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Health endpoint returns status, devMode, and devOtp"

  - task: "Dev Mode Login (Static OTP 666666)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Implemented /api/auth/dev-login endpoint. Tested with curl - returns user data and devToken. Works for super admin (9899273448) and regular users."

  - task: "Firebase Token Verification"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Works in both dev mode (with dev-token-*) and production mode (with Firebase tokens)"

  - task: "User Management (Admin)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Endpoints exist: GET /api/admin/users, PUT /api/admin/users/{phone}"

frontend:
  - task: "Login Screen with Dev Mode"
    implemented: true
    working: "NA"
    file: "frontend/app/login.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Updated to check backend dev mode on mount. Uses /api/auth/dev-login when in dev mode."

  - task: "Auth Context with Dev Token Support"
    implemented: true
    working: "NA"
    file: "frontend/contexts/AuthContext.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Updated to store and use dev tokens for authenticated requests"

  - task: "Dashboard Screen"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/index.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false

  - task: "Orders Screen"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/orders.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false

  - task: "Create Order Screen"
    implemented: true
    working: "NA"
    file: "frontend/app/create-order.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false

  - task: "Reports Screen"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/reports.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false

  - task: "Settings Screen"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/settings.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false

  - task: "Users Screen (Admin)"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/users.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Dev Mode Login (Static OTP 666666)"
    - "Login Screen with Dev Mode"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Implemented Development Mode feature:
      1. Added DEV_MODE=true to backend/.env
      2. Created /api/auth/dev-login endpoint that accepts any phone + OTP 666666
      3. Updated frontend login to check backend dev mode and use appropriate flow
      4. Updated AuthContext to handle dev tokens
      5. Updated FIREBASE_SETUP.md documentation
      
      Backend tested with curl - all working. Frontend needs testing on device.