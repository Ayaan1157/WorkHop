import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

import Landing from "@/pages/Landing";
import Profile from "@/pages/Profile";
import Categories from "@/pages/Categories";
import Legal from "@/pages/Legal";
import Support from "@/pages/Support";
import LiveMap from "@/pages/LiveMap";
import Admin from "@/pages/Admin";
import Chat from "@/pages/Chat";
import Pro from "@/pages/Pro";
import Employer from "@/pages/employer/Employer";
import Plans from "@/pages/employer/Plans";
import PostJob from "@/pages/employer/PostJob";
import Inbox from "@/pages/employer/Inbox";
import Onboarding from "@/pages/freelancer/Onboarding";
import Jobs from "@/pages/freelancer/Jobs";
import FreelancerChats from "@/pages/freelancer/Chats";
import FreelancerProfile from "@/pages/freelancer/FreelancerProfile";

import ErrorBoundary from "@/components/ErrorBoundary";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/profile" element={<FreelancerProfile />} />
            <Route path="/settings" element={<Profile />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/support" element={<Support />} />
            <Route path="/map" element={<LiveMap />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/chat/:id" element={<Chat />} />
            <Route path="/pro/:id" element={<Pro />} />
            <Route path="/employer" element={<Employer />} />
            <Route path="/employer/plans" element={<Plans />} />
            <Route path="/employer/post-job" element={<PostJob />} />
            <Route path="/employer/inbox" element={<Inbox />} />
            <Route path="/freelancer" element={<Onboarding />} />
            <Route path="/freelancer/jobs" element={<Jobs />} />
            <Route path="/freelancer/chats" element={<FreelancerChats />} />
            <Route path="/freelancer/profile" element={<FreelancerProfile />} />
          </Routes>
        </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
