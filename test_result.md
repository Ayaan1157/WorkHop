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
## Session: Employer Plans + Logo (June 2026 fork)
backend:
  - task: "GET /api/plans catalog (6 plans: postings + branding)"
    implemented: true
    working: "unknown"
    file: "/app/backend/server.py"
    needs_retesting: true
  - task: "POST /api/employer/plans/purchase (mock payment, expiry for time-bound plans)"
    implemented: true
    working: "unknown"
    file: "/app/backend/server.py"
    needs_retesting: true
  - task: "GET /api/employer/{employer_id}/plans (active plans, excludes expired)"
    implemented: true
    working: "unknown"
    file: "/app/backend/server.py"
    needs_retesting: true
frontend:
  - task: "Landing page WorkHop logo image (replaces W mark + wordmark)"
    implemented: true
    working: "unknown"
    file: "/app/frontend/app/index.tsx"
    needs_retesting: true
  - task: "Employer Plans & Pricing screen with mock payment bottom sheet + active plans"
    implemented: true
    working: "unknown"
    file: "/app/frontend/app/employer/plans.tsx"
    needs_retesting: true
  - task: "Employer screen entry points (topbar pricetag btn + plans banner)"
    implemented: true
    working: "unknown"
    file: "/app/frontend/app/employer/index.tsx"
    needs_retesting: true
agent_communication:
  - agent: "main"
    message: "Added employer monetization plans (6 plans across postings/branding sections), mock purchase flow via bottom sheet, active plans display, and the WorkHop logo on landing. Backend curl-verified. Smoke screenshots passed. Pre-existing flows (₹199 unlock, ₹99 wizard, jobs feed) unchanged except employer topbar icon + banner."

## Session: 200-gig catalog + employer lead search (June 2026 fork)
backend:
  - task: "seeds/jobs.json expanded to 200 gigs (Creative 56/Tech 48/Marketing 48/Ops 48) with keywords field on Job model"
    implemented: true
    working: "unknown"
    needs_retesting: true
  - task: "seeds/leads.json — 50 freelancer leads (one per profession) with keywords; /api/leads/preview + /api/employer/unlock return 50"
    implemented: true
    working: "unknown"
    needs_retesting: true
frontend:
  - task: "Jobs feed search now also matches keywords array (sketchup, flutterflow, gst, etc.)"
    implemented: true
    working: "unknown"
    file: "/app/frontend/app/freelancer/jobs.tsx"
    needs_retesting: true
  - task: "Employer screen skill search bar (testID leads-search-input) filtering 50 leads by skill/name/keywords with empty state"
    implemented: true
    working: "unknown"
    file: "/app/frontend/app/employer/index.tsx"
    needs_retesting: true
agent_communication:
  - agent: "main"
    message: "Expanded seed data (200 jobs, 50 leads) with keyword search on both sides. All 49 pytest tests updated & passing locally. Plans feature from iteration_6 unchanged."

## Session: Quota boost rework (₹149 / +5 applies)
backend:
  - task: "Quota unlock reworked: ₹149 boost adds +5 applies for 24h (max 8/day); 409 if boost active; fields has_boost/boost_until/quota_limit"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "49/49 pytest incl. new full lifecycle test in test_apply_quota.py"
frontend:
  - task: "Jobs feed quota bar + paywall updated: '+5 APPLIES ₹149' button, boost-on state, daily-limit-reached sheet variant"
    implemented: true
    working: "unknown"
    file: "/app/frontend/app/freelancer/jobs.tsx"
    needs_retesting: false
agent_communication:
  - agent: "main"
    message: "Backend verified via pytest; frontend changes are field renames + copy verified by lint; smoke screenshot OK."

## Session: Real Razorpay integration (test mode)
backend:
  - task: "POST /api/payments/create-order (server-side amounts for 4 products) + POST /api/payments/verify (HMAC signature check + fulfillment + idempotency)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "All 4 products fulfilled with locally-signed HMAC test; bad signature 400; 49/49 pytest"
frontend:
  - task: "Real Razorpay checkout via useRazorpay hook (web: checkout.js, native: WebView modal) in all 4 payment flows; mock chips removed"
    implemented: true
    working: "unknown"
    file: "/app/frontend/src/payments.tsx, /app/frontend/src/components/RazorpayModal.tsx, app/employer/index.tsx, app/employer/plans.tsx, app/freelancer/index.tsx, app/freelancer/jobs.tsx"
    needs_retesting: true
agent_communication:
  - agent: "main"
    message: "Razorpay TEST keys in backend/.env. Checkout iframe verified opening on employer unlock. Need E2E test-card payment through iframe: card 4111 1111 1111 1111, any future expiry, any CVV, then Success on mock OTP page."

## Session: Auth + Chat + Map + Employer chips (4-feature batch)
backend:
  - task: "Emergent Google auth: POST /api/auth/session, GET /api/auth/me, POST /api/auth/logout + user_sessions TTL indexes"
    implemented: true
    working: true
    needs_retesting: false
  - task: "Jobs anonymized: company_name + area only, no employer_name/employer_phone ever"
    implemented: true
    working: true
    needs_retesting: false
  - task: "Chat: conversation auto-created on apply; GET /api/chats (freelancer_id filter or employer all), GET/POST /api/chats/{id}/messages"
    implemented: true
    working: true
    needs_retesting: false
  - task: "GET /api/map/pins — 50 candidates + 14 employers with Bengaluru lat/lng"
    implemented: true
    working: true
    needs_retesting: false
frontend:
  - task: "Login gate on landing (Continue with Google), user chip + logout, AuthProvider in _layout"
    implemented: true
    working: true
    needs_retesting: false
  - task: "OSM Leaflet map: embedded on employer screen + full /map screen with pros/employers filters"
    implemented: true
    working: true
    needs_retesting: false
  - task: "Chat thread /chat/[id] (3s polling), freelancer inbox /freelancer/chats, employer inbox /employer/inbox; MESSAGE button on applied job cards; jobs cards show company+area only"
    implemented: true
    working: "unknown"
    needs_retesting: true
  - task: "Employer screen category chips (lead-bucket-chip-row) + inbox icon (employer-inbox-btn)"
    implemented: true
    working: true
    needs_retesting: false
agent_communication:
  - agent: "main"
    message: "Auth bypass for testing documented in /app/memory/test_credentials.md (token test_token_workhop_e2e already seeded in Mongo). 49/49 pytest green. Chat flow needs frontend E2E: apply -> chat opens -> messages both sides."

## Session: v2 batch (reviews, profiles, post-a-job, support/legal, catalog, UPI)
backend:
  - task: "POST /api/chats/{id}/status (applied->hired->completed), POST/GET /api/reviews (two-way, dup 409, only after completed), GET /api/pros/{lead_id}"
    implemented: true
    working: true
    needs_retesting: false
  - task: "POST /api/employer/jobs (credit-gated, 402 without credits), GET post-credits, custom jobs merged into /api/jobs feed + apply works on cjob ids"
    implemented: true
    working: true
    needs_retesting: false
  - task: "POST /api/complaints (stored, returns manarastudio22@gmail.com), GET /api/catalog (9 cats, 110 subs)"
    implemented: true
    working: true
    needs_retesting: false
frontend:
  - task: "Razorpay method config upi/card/netbanking/wallet in web + native checkout"
    implemented: true
    working: "unknown"
    needs_retesting: true
  - task: "Chat lifecycle bar (HIRE PRO -> MARK COMPLETED -> RATE) + review modal (stars + text)"
    implemented: true
    working: "unknown"
    needs_retesting: true
  - task: "Pro public profile /pro/[id] (tap lead card), post-a-job form /employer/post-job (POST A JOB btn on employer screen), profile /profile (user-chip), support /support (complaint form), legal /legal, categories /categories (jobs q param search)"
    implemented: true
    working: "unknown"
    needs_retesting: true
agent_communication:
  - agent: "main"
    message: "Backend fully curl-verified + 66/66 pytest. Profile & categories smoke-tested via screenshots. Needs E2E: chat hire/complete/review flow, post-a-job with 402->pay->publish, complaint submit, pro profile from lead card, subcategory->jobs search."

## Session: coupons in all payment windows
backend:
  - task: "POST /api/coupons/validate + coupon_code in /api/payments/create-order (WELCOME50 50% all, FLAT100 flat plan-only; server-side amounts; used_count on verify)"
    implemented: true
    working: true
    needs_retesting: false
frontend:
  - task: "CouponInput in 5 payment windows (onboarding-, boost-, unlock-, plan-, pro- coupon testIDs); discounted CTA labels"
    implemented: true
    working: true
    needs_retesting: false
agent_communication:
  - agent: "main"
    message: "iteration_22: 18/18 backend, 4/5 windows live-verified (boost paywall code-verified, needs verified freelancer with exhausted quota to reach). Post-test fix: CTA labels + sheet titles now show discounted final amount (verified via screenshot on /employer/plans)."

## Session: Admin Dashboard
backend:
  - task: "/api/admin/* (overview, users w/ roles, freelancers + approve, payments, complaints, coupon CRUD) gated by ADMIN_EMAILS; is_admin in auth responses"
    implemented: true
    working: true
    needs_retesting: false
frontend:
  - task: "/admin dashboard (5 tabs + stats strip), profile-admin row only for admin, denied screen for others, coupon create/disable UI, freelancer approve/revoke"
    implemented: true
    working: true
    needs_retesting: false
agent_communication:
  - agent: "main"
    message: "iteration_23: 36/36 backend + all frontend admin flows pass. Fixed duplicate-key warnings post-test (index fallback keys). Stats strip is a horizontal ScrollView by design. Admin token test_token_workhop_admin in test_credentials.md."
