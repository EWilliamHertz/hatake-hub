import { useState, useEffect } from 'react';
import { Home, Search, PlusSquare, MessageCircle, User, Layers, ShoppingBag, Repeat, Users, Heart } from "lucide-react";

export type NavItemId = 'feed' | 'market' | 'create' | 'chat' | 'profile' | 'collection' | 'shop' | 'trades' | 'community' | 'wishlist';

export const NAV_ITEMS = [
  { id: 'feed', label: 'Home', icon: Home, path: '/feed' },
  { id: 'market', label: 'Market', icon: Search, path: '/marketplace' },
  { id: 'create', label: 'Create', icon: PlusSquare, path: null, isAction: true },
  { id: 'chat', label: 'Chat', icon: MessageCircle, path: '/messenger' },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  { id: 'collection', label: 'Cards', icon: Layers, path: '/collection' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, path: '/shop' },
  { id: 'trades', label: 'Trades', icon: Repeat, path: '/trades' },
  { id: 'community', label: 'Social', icon: Users, path: '/community' },
  { id: 'wishlist', label: 'Wants', icon: Heart, path: '/wishlist' },
];

// Default to 4 items so there is room for the Menu button
const DEFAULT_NAV: NavItemId[] = ['feed', 'market', 'create', 'profile'];

export const useNavSettings = () => {
  // Load initial state safely
  const [activeNavIds, setActiveNavIds] = useState<NavItemId[]>(() => {
    try {
        const saved = localStorage.getItem('hatake-nav-prefs');
        const parsed = saved ? JSON.parse(saved) : DEFAULT_NAV;
        // Force limit to 4 items on load to prevent layout breakage
        return Array.isArray(parsed) ? parsed.slice(0, 4) : DEFAULT_NAV;
    } catch {
        return DEFAULT_NAV;
    }
  });

  // ✅ NEW: Listen for changes from other components (like Settings page)
  useEffect(() => {
    const handleStorageChange = () => {
       const saved = localStorage.getItem('hatake-nav-prefs');
       if (saved) {
         try {
            setActiveNavIds(JSON.parse(saved));
         } catch (e) {
            console.error("Failed to parse nav settings", e);
         }
       }
    };
    
    // Listen for our custom event
    window.addEventListener('nav-settings-updated', handleStorageChange);
    return () => window.removeEventListener('nav-settings-updated', handleStorageChange);
  }, []);

  const saveNav = (newIds: NavItemId[]) => {
    const validIds = newIds.slice(0, 4); // Enforce max 4
    setActiveNavIds(validIds);
    localStorage.setItem('hatake-nav-prefs', JSON.stringify(validIds));
    
    // ✅ NEW: Broadcast the change to the whole app
    window.dispatchEvent(new Event('nav-settings-updated'));
  };

  return { 
    activeNavIds, 
    saveNav, 
    allOptions: NAV_ITEMS 
  };
};