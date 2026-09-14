import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import TestModeBanner from "@/components/TestModeBanner";
import RouteMeta from "@/components/RouteMeta";
import CanonicalDomainRedirect from "@/components/CanonicalDomainRedirect";
import { lazy, Suspense } from 'react';
// Add page imports here
// Route-level code splitting: lazy-load pages so the initial bundle stays
// small. Layout and AdminRoute stay eager (they wrap/guard routes).
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
import Layout from '@/components/grind/Layout';
const Welcome = lazy(() => import('@/pages/Welcome'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Account = lazy(() => import('@/pages/Account'));
const TeenHome = lazy(() => import('@/pages/TeenHome'));
const TeenListings = lazy(() => import('@/pages/TeenListings'));
const TeenBookings = lazy(() => import('@/pages/TeenBookings'));
const TeenEarnings = lazy(() => import('@/pages/TeenEarnings'));
const TeenWallet = lazy(() => import('@/pages/TeenWallet'));
const ParentDashboard = lazy(() => import('@/pages/ParentDashboard'));
const ParentApprovals = lazy(() => import('@/pages/ParentApprovals'));
const ParentPayouts = lazy(() => import('@/pages/ParentPayouts'));
const Browse = lazy(() => import('@/pages/Browse'));
const JobBoard = lazy(() => import('@/pages/JobBoard'));
const BuyerHome = lazy(() => import('@/pages/BuyerHome'));
const TeenPublicProfile = lazy(() => import('@/pages/TeenPublicProfile'));
const BuyerPublicProfile = lazy(() => import('@/pages/BuyerPublicProfile'));
const BuyerBookings = lazy(() => import('@/pages/BuyerBookings'));
const BookingDetail = lazy(() => import('@/pages/BookingDetail'));
const VideoRoom = lazy(() => import('@/pages/VideoRoom'));
const Messages = lazy(() => import('@/pages/Messages'));
const ChatThread = lazy(() => import('@/pages/ChatThread'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Admin = lazy(() => import('@/pages/Admin'));
import AdminRoute from '@/components/grind/AdminRoute';
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const Compliance = lazy(() => import('@/pages/Compliance'));
const Support = lazy(() => import('@/pages/Support'));
const Safety = lazy(() => import('@/pages/Safety'));
const About = lazy(() => import('@/pages/About'));
const Faq = lazy(() => import('@/pages/Faq'));
const HowItWorks = lazy(() => import('@/pages/HowItWorks'));
const OAuthConsent = lazy(() => import('@/pages/OAuthConsent'));
const WithdrawalAssistant = lazy(() => import('@/pages/WithdrawalAssistant'));
const ResolveExpiredJob = lazy(() => import('@/pages/ResolveExpiredJob'));

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
        <Suspense fallback={
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-[3px] border-muted border-t-primary rounded-full animate-spin" />
          </div>
        }>
        <Routes location={location}>
      {/* Public landing + auth */}
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public static pages (own footer, no Layout) */}
      <Route path="/about" element={<About />} />
      <Route path="/safety" element={<Safety />} />
      <Route path="/faq" element={<Faq />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/compliance" element={<Compliance />} />
      <Route path="/support" element={<Support />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/oauth-consent" element={<OAuthConsent />} />

      {/* Authenticated app — Layout provides nav + footer */}
      <Route element={<Layout />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/account" element={<Account />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/jobs" element={<JobBoard />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:threadId" element={<ChatThread />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/bookings/:id/video" element={<VideoRoom />} />
        <Route path="/jobs/:id/resolve" element={<ResolveExpiredJob />} />
        <Route path="/teens/:id" element={<TeenPublicProfile />} />
        <Route path="/neighbors/:id" element={<BuyerPublicProfile />} />
        <Route path="/withdrawal-assistant" element={<WithdrawalAssistant />} />

        {/* Teen */}
        <Route path="/teen" element={<TeenHome />} />
        <Route path="/teen/listings" element={<TeenListings />} />
        <Route path="/teen/bookings" element={<TeenBookings />} />
        <Route path="/teen/earnings" element={<TeenEarnings />} />
        <Route path="/teen/wallet" element={<TeenWallet />} />

        {/* Parent */}
        <Route path="/parent" element={<ParentDashboard />} />
        <Route path="/parent/approvals" element={<ParentApprovals />} />
        <Route path="/parent/payouts" element={<ParentPayouts />} />

        {/* Buyer */}
        <Route path="/buyer" element={<BuyerHome />} />
        <Route path="/buyer/bookings" element={<BuyerBookings />} />

        {/* Admin */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
        </Routes>
        </Suspense>
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
          <CanonicalDomainRedirect />
          <TestModeBanner />
          <RouteMeta />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App