import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Layout from "@/components/Layout";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Collection from "./pages/Collection";
import Marketplace from "./pages/Marketplace";
import DeckBuilder from "./pages/DeckBuilder";
import Shop from "./pages/Shop";
import Trades from "./pages/Trades";
import Profile from "./pages/Profile";
import Wishlist from "./pages/Wishlist";
import Settings from "./pages/Settings";
import Messenger from "./pages/Messenger";
import NotFound from "./pages/NotFound";
import Community from "./pages/Community";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Wrapper for protected routes with Layout
const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Layout />;
};

const AppContent = () => {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        
        {/* Protected Routes with Layout */}
        <Route element={<ProtectedLayout />}>
          <Route path="/feed" element={<Feed />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/deck-builder" element={<DeckBuilder />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:uid" element={<Profile />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/messenger" element={<Messenger />} />
          <Route path="/community" element={<Community />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <AppContent />
            <PWAInstallPrompt />
            <Toaster />
            <Sonner />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
