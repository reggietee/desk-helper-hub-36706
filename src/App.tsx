
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { MemberGuard } from "@/components/guards/MemberGuard";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SignProductOut from "./pages/SignProductOut";
import BookCallRoom from "./pages/BookCallRoom";
import BookMeetingRoom from "./pages/BookMeetingRoom";
import BookPrivateOffice from "./pages/BookPrivateOffice";
import SubmitIssue from "./pages/SubmitIssue";
import GuestDayPass from "./pages/GuestDayPass";
import SpecialOffers from "./pages/SpecialOffers";
import ComingSoon from "./pages/ComingSoon";
import AdminScheduleHistory from "./pages/AdminScheduleHistory";
import AdminPanel from "./pages/AdminPanel";
import CallRoom from "./pages/CallRoom";
import Live from "./pages/Live";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Member-only routes - wrapped in MemberGuard */}
            <Route path="/equipment-checkout" element={<MemberGuard><SignProductOut /></MemberGuard>} />
            <Route path="/sign-product-out" element={<MemberGuard><SignProductOut /></MemberGuard>} />
            <Route path="/book-call-room" element={<MemberGuard><BookCallRoom /></MemberGuard>} />
            <Route path="/book-meeting-room" element={<MemberGuard><BookMeetingRoom /></MemberGuard>} />
            <Route path="/book-private-office" element={<MemberGuard><BookPrivateOffice /></MemberGuard>} />
            <Route path="/submit-issue" element={<MemberGuard><SubmitIssue /></MemberGuard>} />
            <Route path="/guest-day-pass" element={<MemberGuard><GuestDayPass /></MemberGuard>} />
            <Route path="/special-offers" element={<MemberGuard><SpecialOffers /></MemberGuard>} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/schedule-history" element={<AdminScheduleHistory />} />
            <Route path="/call/:callId" element={<CallRoom />} />
            <Route path="/live" element={<Live />} />
            <Route path="/coming-soon" element={<MemberGuard><ComingSoon /></MemberGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
