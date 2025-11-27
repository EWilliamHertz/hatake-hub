import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import Feed from "./pages/Feed";
import Collection from "./pages/Collection";
import DeckBuilder from "./pages/DeckBuilder";
import Marketplace from "./pages/Marketplace";
import Shop from "./pages/Shop";
import Messenger from "./pages/Messenger";
import Auth from "./pages/Auth";
import Wishlist from "./pages/Wishlist";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { BottomNav } from "./components/BottomNav";
import Trades from "./pages/Trades";
import Settings from "./pages/Settings";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/collection" element={<Collection />} />
              <Route path="/deck-builder" element={<DeckBuilder />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/messages" element={<Messenger />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
              <Route path="/trades" element={<Trades />} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            </Routes>
            <BottomNav />
          </div>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
