import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import AppLayout from '@/components/grind/AppLayout';
import Onboarding from '@/pages/Onboarding';
import Home from '@/pages/Home';
import Listings from '@/pages/Listings';
import Bookings from '@/pages/Bookings';
import BookingDetail from '@/pages/BookingDetail';
import Messages from '@/pages/Messages';
import Chat from '@/pages/Chat';
import Earnings from '@/pages/Earnings';
import Approvals from '@/pages/Approvals';
import Payouts from '@/pages/Payouts';
import Profile from '@/pages/Profile';
import TeenPublic from '@/pages/TeenPublic';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/:bookingId" element={<BookingDetail />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:threadId" element={<Chat />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/payouts" element={<Payouts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/teen/:teenUserId" element={<TeenPublic />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
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