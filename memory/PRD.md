# WorkHop — Hyperlocal Gig Platform (4-Step UX Flow)

## Product
Dual-sided hyperlocal gig marketplace with monetization on both sides:
- **Employer ₹199 Lead Unlock** — blurred map tollgate revealing 5 nearby verified pros.
- **Freelancer ₹99 Verified Pro Onboarding** — 4-step wizard with locked progression.

## Visual System
"Electric Punch Neo-Minimalism" → Brutalist Mobile Light
- Palette: `#FF5A00` electric orange · `#FFFFFF` matte white · `#F9F9F6` off-white · `#121212` matte black.
- 2pt black borders, 0-radius hard edges, brand orange accents.

## Architecture
- **Frontend** Expo Router screens:
  - `/` Landing role toggle (Employer / Freelancer)
  - `/employer` Hyperlocal map tollgate + mock Razorpay/UPI bottom sheet
  - `/freelancer` 4-step Verified Pro wizard + processing overlay
- **Backend** FastAPI + MongoDB
  - `GET /api/leads/preview` — 5 seeded leads
  - `POST /api/employer/unlock` — mock ₹199 payment, returns full lead data
  - `POST /api/freelancer/pay` — mock ₹99 onboarding, creates freelancer record
  - `POST /api/freelancer/aadhaar/verify` — mocked Aadhaar (12-digit regex + dummy reject)
  - `POST /api/freelancer/submit` — final onboarding submission

## Key UX Behaviours
- 5 lead cards rendered with `expo-blur` over text fields (name/phone/portfolio) until ₹199 paid.
- Successful unlock dynamically un-blurs all cards via state-driven re-render.
- Steps 2/3/4 of freelancer wizard rendered at 0.4 opacity & `pointerEvents=none` until Step 1 returns success.
- Progress bar in electric orange with step-dots that turn solid orange as each step completes.
- Submission triggers a full-screen overlay with a bouncing kangaroo (animated) and the "leap live within 2 hours" status.

## Out-of-scope (MOCKED)
- Razorpay / UPI gateway is fully MOCKED — `setTimeout`-style backend delay simulates verification. No real money.
- Aadhaar verification is MOCKED — server validates only digit count and rejects a few obvious dummy numbers.

## Session Update (June 2026 fork)
- Added official WorkHop kangaroo logo (user-provided) to landing page: `/app/frontend/assets/images/workhop-logo.png` (trimmed/compressed to 640x349, 175KB), replacing the old "W" mark + wordmark.
- Employer monetization "Plans & Pricing" screen (`/app/frontend/app/employer/plans.tsx`), all payments MOCKED:
  - A. Job Postings & Premium Listings: Single Post ₹299, Starter Bundle (5 posts) ₹999 [SAVE 33%], Premium Listing Boost ₹299/post [ADD-ON]
  - B. Employer Branding & Classified Ads: Brand Spotlight ₹4,999/7d, Classified Ad Slot ₹9,999/30d, Enterprise Branding Suite ₹24,999/30d [BEST VALUE]
- Backend: `GET /api/plans`, `POST /api/employer/plans/purchase`, `GET /api/employer/{employer_id}/plans` (active only, expiry-filtered). Purchases in `plan_purchases` collection. Employer identity via AsyncStorage `workhop_employer_id`.
- Entry points: employer topbar pricetag button + black "FOR EMPLOYERS" banner at end of leads list.
- Existing prices unchanged per user: ₹199 lead unlock, ₹99 verification, ₹49 quota.
- Tested: iteration_6.json — 11/11 backend, 8/8 frontend, no bugs.
- Refactor: 50-gig seed data moved from server.py to `/app/backend/seeds/jobs.json` (loaded at startup). All 49 backend tests pass; API output identical.
- Quota model changed (user request): ₹49 unlimited-24h REPLACED by ₹149 Boost = +5 extra applies for 24h (daily max 8 = 3 free + 5). Double-purchase while active → 409. API fields renamed: has_unlimited/unlimited_until → has_boost/boost_until; quota_limit now effective (3 or 8). 49/49 pytest green.
- Employer lead search + 50-lead directory and 200-gig catalog verified in iteration_7.json.
- PENDING: user agreed to real Razorpay integration — awaiting rzp_test Key ID + Key Secret from user. All payments still MOCKED.
- 4-feature batch (June 2026): 
  1. Emergent Google login gate on landing (AuthProvider, /api/auth/session|me|logout, users + user_sessions TTL, test bypass token documented in memory/test_credentials.md).
  2. OpenStreetMap (Leaflet, no keys) interactive pin map centered Bengaluru: embedded on employer screen + full /map screen (candidate=orange, employer=black pins, filters + legend). GET /api/map/pins (50 candidates, 14 companies). Seeds now carry lat/lng + area.
  3. Employer anonymization + chat: /api/jobs exposes ONLY company_name + area (employer names/phones removed everywhere). Applying auto-creates a conversation; screens: /chat/[id] (3s polling), /freelancer/chats, /employer/inbox; MESSAGE button on applied cards; employer shares contact via chat only.
  4. Category chips (ALL/Creative/Tech/Marketing/Ops) on employer leads screen; leads have bucket field.
- Tested: iteration_8.json — 66/66 backend pytest, 7/7 frontend flows, zero issues.
- Landing flow reordered (user request): role cards (I'M HIRING / I'M A PRO) are the FIRST page; tapping a card shows a contextual Google sign-in page (back btn returns to cards); pending role stored in AsyncStorage 'workhop_pending_role' and consumed after login to auto-continue to /employer or freelancer flow. Verified via browser automation.

## Session Update (June 2026 — fork continuation)
- UPI checkout config added (blocked on user enabling UPI in Razorpay dashboard; methods.upi=false on test merchant)
- Complaint emails via Resend BackgroundTask (needs RESEND_API_KEY; DB-only until then)
- 9 catalog categories rolled out: illustrated tiles (Urban-Company style) on jobs feed + employer screen; post-a-job uses 9 categories (mapped to legacy buckets server-side)
- Search bars replaced with tappable CategoryBrowser modal (9 cats → subcats drill-down + free text suggestions)
- FilterSheet: jobs (budget, distance), leads (₹/hr budget, distance, language, delivery time)
- Landing: "I'M A PRO" renamed to "I'M LOOKING FOR A JOB"; pros browse jobs without sign-in; Google sign-in at APPLY; verification wizard after sign-in
- Lead cards: rating/reviews, intro, area+distance, ₹/hr, delivery, jobs done visible; phone + portfolio blurred until ₹199 unlock (persisted via AsyncStorage)
- /pro/[id]: full Fiverr-style profile with UNLOCK THIS LEAD · ₹199 CTA (serves seeded + real pros)
- Freelancer wizard step 3 parity: phone, skill, category, ₹/hr, delivery, languages, intro, optional location + Fiverr/Upwork rating import (self-declared, shows "imported" badge)
- Real verified pros (with phone) merged into employer leads ahead of 50 seeds
- expo-location integrated (map "you are here", NEAR ME ranking on employer screen)
- Backend Lead model enriched: area, rate_hr, intro, languages, delivery_days, reviews_count, external_rating_source

## Session Update (June 2026 — coupons)
- Coupon system in ALL 5 payment windows (both roles): freelancer onboarding ₹99, quota boost ₹149, employer lead unlock ₹199 (employer screen + /pro/[id]), employer plans.
- Backend: db.coupons seeded idempotently — WELCOME50 (50% off, all products), FLAT100 (₹100 off, plans only). POST /api/coupons/validate (404 invalid, 400 ineligible/empty, 409 fully redeemed, 410 expired); create-order accepts coupon_code, amount ALWAYS server-computed (₹1 floor); verify increments used_count.
- Frontend: shared CouponInput component (src/components/CouponInput.tsx) — apply/remove, inline errors, "you save ₹X — pay ₹Y"; CTA labels + sheet titles show discounted price; coupon_code forwarded via startPayment.
- Tested: iteration_22.json — 18/18 backend pytest (tests/test_coupons.py), 4/5 windows live-verified on web (quota-boost paywall code-verified), discounted CTA verified via screenshot.
- Coupon admin/management UI: NOT built (coupons seeded in code) — future task.

## Session Update (June 2026 — Admin Dashboard)
- Hidden Admin Dashboard at /admin, entry via "Admin Dashboard" row on /profile — visible ONLY to manarastudio22@gmail.com (backend ADMIN_EMAILS, is_admin flag on /api/auth/me).
- Tabs: USERS (role employer/freelancer + approved badge), PROS (full details + APPROVE/REVOKE by WorkHop), PAYMENTS (amount, coupon used + savings, status), ISSUES (complaints), COUPONS (create % or flat ₹, per-product, max uses, expiry days; enable/disable) + stats strip (users/pros/paid orders/revenue/issues).
- Backend: /api/admin/* endpoints gated by _require_admin (401 no token, 403 non-admin). Freelancer approval sets approved_by_admin + status approved/under_review (display only, does not gate lead visibility).
- Tested: iteration_23 — 36/36 backend pytest + all frontend flows pass. Post-test: added key fallbacks in list renderers.
- Admin test token: test_token_workhop_admin (see memory/test_credentials.md).
