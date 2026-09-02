# Cross-Platform Port Blueprint: WorkHop (Mobile to Web)

## 1. Detection
- **Source Platform:** `mobile` (React Native / Expo)
- **Target Platform:** `web` (React / Tailwind / Shadcn)
- **Evidence:** The `/app/mobile` directory contains a fully populated and functional Expo application (with screens for `employer`, `freelancer`, chat, map, etc.). The `/app/frontend` directory is currently a boilerplate Create React App (CRA) initialized with Shadcn UI, waiting for the web implementation.

## 2. Existing App Map (Mobile)
The source mobile app provides dual flows for Employers and Freelancers, with a unified backend.
- **Auth Context (`src/auth.tsx`):** Manages user session via JWT, integrating with backend endpoints (Google OAuth / OTP).
- **Core Screens & Flows:**
  - `/` (Landing): Landing page with OTP and Google login flows.
  - `/admin`: Administration dashboard.
  - `/categories`: Fiverr-like service category catalog.
  - `/legal`: Legal terms and privacy policy.
  - `/map`: Live map showing nearby professionals and active jobs (implemented in mobile via Leaflet HTML in a `WebView`).
  - `/support`: Form to submit support complaints.
  - `/pro/[id]`: Public profile view for a verified professional, including reviews.
  - **Employer Flow:**
    - `/employer/index`: Dashboard to browse and unlock verified leads.
    - `/employer/inbox`: List of active candidate conversations.
    - `/employer/plans`: Employer plan and bundle catalog for purchasing job posts or branding.
    - `/employer/post-job`: Form to post a custom job to the platform.
  - **Freelancer Flow:**
    - `/freelancer/index`: 3-step onboarding flow (Pay onboarding fee -> Verify Aadhaar -> Submit profile details & portfolio).
    - `/freelancer/jobs`: Job feed where freelancers can view and apply to posted jobs (managing application quotas/boosts).
    - `/freelancer/chats`: Inbox for chats with employers.
    - `/profile`: Form to edit the freelancer's active profile.
  - **Shared Messaging:**
    - `/chat/[id]`: Unified chat interface for specific conversations.

## 3. Shared Backend API Surface
The web application MUST reuse the exact same `/api` endpoints defined in `/app/backend/server.py`:
- **Auth:** `POST /api/auth/session`, `POST /api/auth/email/request-otp`, `POST /api/auth/email/verify-otp`, `GET /api/auth/me`, `POST /api/auth/logout`.
- **Freelancer Onboarding & Management:** `POST /api/freelancer/pay`, `POST /api/freelancer/aadhaar/verify`, `POST /api/freelancer/submit`, `GET/PUT /api/freelancer/{id}/profile`, `GET /api/freelancer/{id}` (status check).
- **Freelancer Jobs & Quota:** `GET /api/jobs`, `GET /api/freelancer/{id}/quota`, `POST /api/jobs/{id}/apply`, `POST /api/freelancer/quota/unlock` (quota boost).
- **Employer Discovery & Hiring:** `GET /api/leads/preview`, `POST /api/employer/unlock` (unlock leads).
- **Employer Job Posting:** `GET /api/employer/{id}/post-credits`, `POST /api/employer/jobs`, `GET /api/employer/{id}/jobs`.
- **Employer Plans & Payments:** `GET /api/plans`, `POST /api/employer/plans/purchase`, `GET /api/employer/{id}/plans`, `POST /api/coupons/validate`, `POST /api/payments/create-order`, `POST /api/payments/verify`.
- **Messaging (Chat):** `GET /api/chats`, `GET /api/chats/{id}`, `GET /api/chats/{id}/messages`, `POST /api/chats/{id}/messages`, `POST /api/chats/{id}/status`.
- **Public & Utilities:** `GET /api/catalog`, `GET /api/map/pins`, `GET /api/pros/{id}`, `POST /api/reviews`, `GET /api/reviews`, `POST /api/complaints`.

## 4. Data Models & Integrations
- **Data Models (MongoDB):** Users, Freelancers, Applications, Conversations, Messages, Unlocks, Purchases, Jobs, Complaints, Reviews.
- **Integrations:**
  - **Razorpay:** For all mock/test payments (Onboarding, Employer Unlock, Job Credits, Quota Boosts).
  - **Emergent Email Proxy:** For transactional support emails.
- **Target Platform Note:** The Web frontend must initiate payments similarly to the mobile app. The mock flows check payment signatures server-side.

## 5. Port Requirements (Target Platform = Web)
The web application must be built inside `/app/frontend` using **React Router DOM, Tailwind CSS, and Shadcn UI**.

**Translation Guidelines:**
- **Navigation:** Replace `expo-router` with `react-router-dom`. Use `<BrowserRouter>` in `App.js` and map out all mobile paths to standard web routes (`/employer`, `/freelancer`, `/chat/:id`, etc.).
- **UI & Layout:**
  - Instead of React Native `View`, `Text`, `ScrollView`, `StyleSheet` -> Use standard DOM elements (`div`, `span`, `main`) combined with Tailwind CSS utility classes.
  - Replicate mobile tabs using a web-friendly layout (e.g., a top Navigation Bar or Sidebar for desktop, falling back to a bottom tab bar on mobile widths).
  - Replace `SafeAreaView` and `KeyboardAvoidingView` with standard CSS flex layouts.
- **Components:** Utilize the pre-configured Shadcn components (`@/components/ui/...`) for buttons, inputs, dialogs (modals), and forms.
- **Icons:** Swap `@expo/vector-icons` for `lucide-react`.
- **Storage:** Replace `AsyncStorage` or `SecureStore` with browser `localStorage` (for session tokens).
- **Environment Variables:** Network calls should use `process.env.REACT_APP_BACKEND_URL` rather than the `BACKEND_URL` expo env.
- **Map Implementation:** The mobile app's map (`/app/mobile/app/map.tsx`) renders Leaflet via a `WebView`. In the web app, implement this cleanly using the `react-leaflet` package (install via yarn) to render standard Leaflet components dynamically.

## 6. Open Questions / Risks
- **Navigation Layout:** The mobile app heavily relies on mobile-centric navigation paradigms (like bottom tabs). The web port should likely consolidate these into a responsive top navigation bar or sidebar for the main agent to design.
- **Razorpay Integration:** The web port will need to use Razorpay's web checkout script rather than a mobile SDK, though if the backend acts as a mock/stub it may just require simple API invocations. The agent building the frontend should confirm how payment mock flows are finalized on the web.
- **Map Dependencies:** Web maps typically require importing Leaflet's CSS alongside `react-leaflet`. The implementer must ensure the map container has an explicit height.