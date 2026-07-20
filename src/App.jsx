import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Layout from '@/components/grind/Layout';
import Welcome from '@/pages/Welcome';
import Onboarding from '@/pages/Onboarding';
import Account from '@/pages/Account';
import TeenHome from '@/pages/TeenHome';
import TeenListings from '@/pages/TeenListings';
import TeenBookings from '@/pages/TeenBookings';
import TeenEarnings from '@/pages/TeenEarnings';
import TeenWallet from '@/pages/TeenWallet';
import ParentDashboard from '@/pages/ParentDashboard';
import ParentApprovals from '@/pages/ParentApprovals';
import ParentPayouts from '@/pages/ParentPayouts';
import Browse from '@/pages/Browse';
import JobBoard from '@/pages/JobBoard';
import BuyerHome from '@/pages/BuyerHome';
import TeenPublicProfile from '@/pages/TeenPublicProfile';
import BuyerBookings from '@/pages/BuyerBookings';
import BookingDetail from '@/pages/BookingDetail';
import Messages from '@/pages/Messages';
import ChatThread from '@/pages/ChatThread';
import Notifications from '@/pages/Notifications';
import Admin from '@/pages/Admin';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Auth pages and the public landing must always render, otherwise
      // unauthenticated users get a blank screen instead of a login form.
      const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
      if (!publicPaths.includes(window.location.pathname)) {
        navigateToLogin();
        return null;
      }
    }
  }

  // Render the main app
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Routes location={location}>
      {/* Add your page Route elements here */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Welcome />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<Layout />}>
        <Route path="/account" element={<Account />} />
        <Route path="/teen" element={<TeenHome />} />
        <Route path="/teen/listings" element={<TeenListings />} />
        <Route path="/teen/bookings" element={<TeenBookings />} />
        <Route path="/teen/earnings" element={<TeenEarnings />} />
        <Route path="/teen/wallet" element={<TeenWallet />} />
        <Route path="/parent" element={<ParentDashboard />} />
        <Route path="/parent/approvals" element={<ParentApprovals />} />
        <Route path="/parent/payouts" element={<ParentPayouts />} />
        <Route path="/buyer" element={<BuyerHome />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/jobs" element={<JobBoard />} />
        <Route path="/teens/:teenUserId" element={<TeenPublicProfile />} />
        <Route path="/buyer/bookings" element={<BuyerBookings />} />
        <Route path="/bookings/:bookingId" element={<BookingDetail />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:threadId" element={<ChatThread />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App