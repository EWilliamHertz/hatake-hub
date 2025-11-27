import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import BottomNav from "@/components/BottomNav";
import { useMobile } from "@/hooks/use-mobile";

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

const queryClient = new QueryClient();

// ✅ FIXED: Added the missing ProtectedRoute component
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

const AppContent = () => {
  const isMobile = useMobile();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background font-sans antialiased pb-16 md:pb-0">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        
        {/* Protected Routes */}
        <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
        <Route path="/collection" element={<ProtectedRoute><Collection /></ProtectedRoute>} />
        <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
        <Route path="/deck-builder" element={<ProtectedRoute><DeckBuilder /></ProtectedRoute>} />
        <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
        <Route path="/trades" element={<ProtectedRoute><Trades /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/messenger" element={<ProtectedRoute><Messenger /></ProtectedRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Show BottomNav only if user is logged in and on mobile */}
      {user && isMobile && <BottomNav />}
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
            <Toaster />
            <Sonner />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;