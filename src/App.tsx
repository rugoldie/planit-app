import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useParams } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Splash from "./pages/Splash";
import Privacy from "./pages/Privacy";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import HostEvent from "./pages/HostEvent";
import EventView from "./pages/EventView";
import JoinEvent from "./pages/JoinEvent";
import GuestEventView from "./pages/GuestEventView";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Friends from "./pages/Friends";
import EventsList from "./pages/EventsList";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Conversation from "./pages/Conversation";

const queryClient = new QueryClient();

/**
 * Keys the boundary by the route's :code param so a crash on one event
 * doesn't permanently wedge the page for every event visited afterward -
 * EventView/GuestEventView reuse the same component instance across an
 * :codeA -> :codeB navigation, and an ErrorBoundary only resets on remount.
 */
const EventErrorBoundary = ({ children }: { children: ReactNode }) => {
  const { code } = useParams();
  return <ErrorBoundary key={code}>{children}</ErrorBoundary>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        {/* Nothing was rendering sonner's toasts, so every toast() call in the
            app (errors included) was silently invisible. */}
        <Toaster theme="dark" position="top-center" richColors />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/home" element={<Home />} />
            <Route path="/host" element={<HostEvent />} />
            <Route
              path="/event/:code"
              element={
                <EventErrorBoundary>
                  <EventView />
                </EventErrorBoundary>
              }
            />
            <Route path="/join" element={<JoinEvent />} />
            <Route
              path="/guest/:code"
              element={
                <EventErrorBoundary>
                  <GuestEventView />
                </EventErrorBoundary>
              }
            />
            <Route path="/profile" element={<Profile />} />
            <Route path="/u/:userId" element={<UserProfile />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/events" element={<EventsList />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:conversationId" element={<Conversation />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
