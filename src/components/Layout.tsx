import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupLabel,
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Home, 
  Layers, 
  ShoppingBag, 
  Store, 
  MessageSquare, 
  Users, 
  User, 
  Heart,
  Hammer,
  ArrowLeftRight,
  Settings,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const NAV_ITEMS = [
  { title: "Feed", path: "/feed", icon: Home },
  { title: "Collection", path: "/collection", icon: Layers },
  { title: "Deck Builder", path: "/deck-builder", icon: Hammer },
  { title: "Marketplace", path: "/marketplace", icon: ShoppingBag },
  { title: "Shop", path: "/shop", icon: Store },
  { title: "Trades", path: "/trades", icon: ArrowLeftRight },
  { title: "Messenger", path: "/messenger", icon: MessageSquare },
  { title: "Community", path: "/community", icon: Users },
  { title: "Wishlist", path: "/wishlist", icon: Heart },
];

const SidebarNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [unreadCount, setUnreadCount] = useState(0);

  // Listen for unread notifications
  useEffect(() => {
    if (!user) return;
    
    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notificationsRef, where('read', '==', false));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <img 
            src="/hatake-logo.png" 
            alt="Hatake" 
            className="h-8 w-8"
          />
          {!collapsed && (
            <span className="font-bold text-lg text-primary">HatakeSocial</span>
          )}
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarMenu>
            {NAV_ITEMS.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton 
                  asChild
                  isActive={isActive(item.path)}
                  tooltip={item.title}
                >
                  <Link to={item.path} className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    {!collapsed && <span>{item.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* User Section */}
        <div className="mt-auto border-t border-border p-4">
          <SidebarMenu>
            {/* Notifications */}
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                tooltip="Notifications"
              >
                <Link to="/notifications" className="flex items-center gap-3 relative">
                  <Bell className="h-5 w-5" />
                  {!collapsed && <span>Notifications</span>}
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Profile */}
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                isActive={isActive('/profile')}
                tooltip="Profile"
              >
                <Link to="/profile" className="flex items-center gap-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.photoURL || ''} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && <span>Profile</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Settings */}
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                isActive={isActive('/settings')}
                tooltip="Settings"
              >
                <Link to="/settings" className="flex items-center gap-3">
                  <Settings className="h-5 w-5" />
                  {!collapsed && <span>Settings</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export const Layout = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // If not logged in, just render the outlet (for auth pages)
  if (!user) return <Outlet />;

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop Sidebar - Hidden on Mobile */}
        {!isMobile && (
          <>
            <SidebarNav />
            {/* Sidebar trigger for desktop */}
            <div className="fixed top-4 left-4 z-50 md:left-auto md:relative md:top-0">
              <SidebarTrigger />
            </div>
          </>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full overflow-x-hidden pb-20 md:pb-0">
          <div className="mx-auto max-w-screen-2xl">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Nav - Hidden on Desktop */}
        {isMobile && <BottomNav />}
      </div>
    </SidebarProvider>
  );
};

export default Layout;
