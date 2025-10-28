
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import SignProductOut from "./pages/SignProductOut";
import BookCallRoom from "./pages/BookCallRoom";
import BookMeetingRoom from "./pages/BookMeetingRoom";
import BookPrivateOffice from "./pages/BookPrivateOffice";
import SubmitIssue from "./pages/SubmitIssue";
import GuestDayPass from "./pages/GuestDayPass";
import SpecialOffers from "./pages/SpecialOffers";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/equipment-checkout" element={<SignProductOut />} />
          <Route path="/sign-product-out" element={<SignProductOut />} />
          <Route path="/book-call-room" element={<BookCallRoom />} />
          <Route path="/book-meeting-room" element={<BookMeetingRoom />} />
          <Route path="/book-private-office" element={<BookPrivateOffice />} />
          <Route path="/submit-issue" element={<SubmitIssue />} />
          <Route path="/guest-day-pass" element={<GuestDayPass />} />
          <Route path="/special-offers" element={<SpecialOffers />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
