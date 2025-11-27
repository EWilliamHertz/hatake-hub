import { Link, useLocation } from "react-router-dom";
import { Home, Search, PlusSquare, MessageCircle, User } from "lucide-react";

// ✅ Changed to 'const' and added 'export default' at the bottom
const BottomNav = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 md:hidden pb-safe">
      <div className="flex justify-around items-center h-16">
        <Link 
          to="/feed" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/feed') ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px]">Home</span>
        </Link>
        
        <Link 
          to="/marketplace" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/marketplace') ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Search className="w-6 h-6" />
          <span className="text-[10px]">Market</span>
        </Link>

        {/* Center Action Button (Create) */}
        <Link 
          to="/create" 
          className="flex flex-col items-center justify-center w-full h-full -mt-6"
        >
          <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg">
            <PlusSquare className="w-6 h-6" />
          </div>
        </Link>

        <Link 
          to="/messenger" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/messenger') ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-[10px]">Chat</span>
        </Link>

        <Link 
          to="/profile" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/profile') ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px]">Profile</span>
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;