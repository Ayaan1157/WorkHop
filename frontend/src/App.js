import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

import Landing from "@/pages/Landing";
import Profile from "@/pages/Profile";
import Categories from "@/pages/Categories";
import Legal from "@/pages/Legal";
import Support from "@/pages/Support";
import Grievance from "@/pages/Grievance";
import Blog from "@/pages/Blog";
import Reviews from "@/pages/Reviews";
import LiveMap from "@/pages/LiveMap";
import Admin from "@/pages/Admin";
import Chat from "@/pages/Chat";
import Pro from "@/pages/Pro";
import Employer from "@/pages/employer/Employer";
import Plans from "@/pages/employer/Plans";
import PostJob from "@/pages/employer/PostJob";
import Inbox from "@/pages/employer/Inbox";
import EmployerDashboard from "@/pages/employer/EmployerDashboard";
import Onboarding from "@/pages/freelancer/Onboarding";
import Jobs from "@/pages/freelancer/Jobs";
import FreelancerChats from "@/pages/freelancer/Chats";
import FreelancerProfile from "@/pages/freelancer/FreelancerProfile";
import { useAuth } from "@/context/AuthContext";

import ErrorBoundary from "@/components/ErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";
import FeaturedBlastToast from "@/components/FeaturedBlastToast";
import CityRestrictionModal from "@/components/CityRestrictionModal";

function ProfileRoute() {
  const { user } = useAuth();
  const role = user?.role || localStorage.getItem("workhop_auth_role") || "freelancer";
  if (role === "employer") {
    return <EmployerDashboard />;
  }
  return <FreelancerProfile />;
}

function EmployerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  const userRole = (user?.role || localStorage.getItem("workhop_auth_role") || "").toLowerCase();
  const isAdmin = Boolean(
    user?.is_admin ||
    userRole === "admin" ||
    ["zenithdeveleoperss@gmail.com", "zenithdeveloperss@gmail.com", "manarastudio22@gmail.com"].includes(user?.email?.toLowerCase())
  );
  if (isAdmin) return children;

  // If user is signed in as a freelancer, redirect to the freelancer site
  if (user && (userRole === "freelancer" || (!userRole.includes("employ") && !userRole.includes("client")))) {
    return <Navigate to="/freelancer/jobs" replace />;
  }

  return children;
}

function FreelancerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  const userRole = (user?.role || localStorage.getItem("workhop_auth_role") || "").toLowerCase();
  const isAdmin = Boolean(
    user?.is_admin ||
    userRole === "admin" ||
    ["zenithdeveleoperss@gmail.com", "zenithdeveloperss@gmail.com", "manarastudio22@gmail.com"].includes(user?.email?.toLowerCase())
  );
  if (isAdmin) return children;

  // If user is signed in as an employer, redirect to the employer site
  if (user && (userRole.includes("employ") || userRole.includes("client"))) {
    return <Navigate to="/employer" replace />;
  }

  return children;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <ScrollToTop />
            <FeaturedBlastToast />
            <CityRestrictionModal />
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/profile" element={<ProfileRoute />} />
            <Route path="/employer/dashboard" element={<EmployerRoute><EmployerDashboard /></EmployerRoute>} />
            <Route path="/employer/profile" element={<EmployerRoute><EmployerDashboard /></EmployerRoute>} />
            <Route path="/settings" element={<Profile />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<Blog />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/support" element={<Support />} />
            <Route path="/grievance" element={<Grievance />} />
            <Route path="/grievance-redressal" element={<Grievance />} />
            <Route path="/map" element={<LiveMap />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/chat/:id" element={<Chat />} />
            <Route path="/pro/:id" element={<Pro />} />
            <Route path="/employer" element={<EmployerRoute><Employer /></EmployerRoute>} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/employer/plans" element={<EmployerRoute><Plans /></EmployerRoute>} />
            <Route path="/freelancer/plans" element={<FreelancerRoute><Plans /></FreelancerRoute>} />
            <Route path="/employer/post-job" element={<EmployerRoute><PostJob /></EmployerRoute>} />
            <Route path="/employer/edit-job/:id" element={<EmployerRoute><PostJob /></EmployerRoute>} />
            <Route path="/employer/inbox" element={<EmployerRoute><Inbox /></EmployerRoute>} />
            <Route path="/freelancer" element={<FreelancerRoute><Onboarding /></FreelancerRoute>} />
            <Route path="/freelancer/jobs" element={<FreelancerRoute><Jobs /></FreelancerRoute>} />
            <Route path="/freelancer/chats" element={<FreelancerRoute><FreelancerChats /></FreelancerRoute>} />
            <Route path="/freelancer/profile" element={<FreelancerRoute><FreelancerProfile /></FreelancerRoute>} />
          </Routes>
        </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
