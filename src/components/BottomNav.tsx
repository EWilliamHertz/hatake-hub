import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Settings } from "lucide-react";
import { useState } from "react";
import { CreateOptionsDialog } from "./CreateOptionsDialog";
import { CreatePostDialog } from "./CreatePostDialog";
import { useNavSettings, NAV_ITEMS } from "@/hooks/useNavSettings";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string | null) => path ? location.pathname === path : false;
  
  const { activeNavIds } = useNavSettings();
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Helper to handle "Create" action vs Navigation
  const handleItemClick = (item: any) => {
    if (item.isAction) {
      setIsOptionsOpen(true);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe pt-1 shadow-[0_-1px_3px_rgba(0,0,0,0.1)] h-16">
        <div className="grid grid-cols-5 h-full pb-1">
          
          {/* 1. Render the 4 User Selected Items */}
          {activeNavIds.map((id) => {
            const item = NAV_ITEMS.find(i => i.id === id);
            if (!item) return null;
            const Icon = item.icon;

            return item.isAction ? (
              <button 
                key={id}
                onClick={() => setIsOptionsOpen(true)}
                className="flex flex-col items-center justify-center w-full h-full -mt-4"
              >
                 <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg border-4 border-background hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
              </button>
            ) : (
              <Link 
                key={id}
                to={item.path!} 
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive(item.path) ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* 2. The Fixed Hamburger Menu (5th Slot) */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button className={`flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground`}>
                <Menu className="w-5 h-5" />
                <span className="text-[10px] font-medium">Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] sm:w-[350px]">
              <SheetHeader className="text-left mb-4">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              
              <ScrollArea className="h-[calc(100vh-100px)] pr-4">
                <div className="grid grid-cols-2 gap-3">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.id}
                        variant="outline"
                        className="h-20 flex-col gap-2 justify-center"
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (item.isAction) setIsOptionsOpen(true);
                          else navigate(item.path!);
                        }}
                      >
                        <Icon className="h-6 w-6" />
                        <span>{item.label}</span>
                      </Button>
                    );
                  })}
                </div>

                <div className="mt-8 pt-4 border-t">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3"
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate('/settings');
                    }}
                  >
                    <Settings className="h-5 w-5" />
                    Settings & Navigation
                  </Button>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

        </div>
      </nav>

      <CreateOptionsDialog 
        open={isOptionsOpen} 
        onOpenChange={setIsOptionsOpen} 
        onCreatePost={() => setIsPostOpen(true)}
      />

      <CreatePostDialog 
        open={isPostOpen} 
        onOpenChange={setIsPostOpen}
      />
    </>
  );
};

export default BottomNav;