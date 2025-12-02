import { useAuth } from "@/contexts/AuthContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Download, LogOut, Moon, Sun, User, GripVertical, X, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useNavSettings, NAV_ITEMS, NavItemId } from "@/hooks/useNavSettings";
import { toast } from "sonner";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isInstallable, install } = usePWAInstall();
  const { activeNavIds, saveNav } = useNavSettings();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Local state for editing
  const [localNavIds, setLocalNavIds] = useState<NavItemId[]>(activeNavIds);
  const [isDirty, setIsDirty] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Sync local state if activeNavIds changes externally
  useEffect(() => {
    setLocalNavIds(activeNavIds);
  }, [activeNavIds]);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
    const newItems = [...localNavIds];
    const draggedItemContent = newItems[dragItem.current!];
    newItems.splice(dragItem.current!, 1);
    newItems.splice(dragOverItem.current!, 0, draggedItemContent);
    dragItem.current = index;
    setLocalNavIds(newItems);
    setIsDirty(true);
  };

  // Toggle Selection
  const toggleNavItem = (id: NavItemId) => {
    if (localNavIds.includes(id)) {
      // Removing item
      if (localNavIds.length > 1) {
        setLocalNavIds(localNavIds.filter(item => item !== id));
        setIsDirty(true);
      } else {
        toast.error("You must keep at least 1 shortcut.");
      }
    } else {
      // Adding item
      if (localNavIds.length >= 4) {
        // Auto-replace the last item if full (User Experience improvement)
        const newIds = [...localNavIds];
        newIds.pop(); // Remove last
        newIds.push(id); // Add new
        setLocalNavIds(newIds);
        setIsDirty(true);
        toast.info("Replaced last item (Max 4)");
      } else {
        setLocalNavIds([...localNavIds, id]);
        setIsDirty(true);
      }
    }
  };

  const handleSave = () => {
    saveNav(localNavIds);
    setIsDirty(false);
    toast.success("Navigation bar updated!");
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

      <div className="p-4 space-y-6 max-w-md mx-auto">
        
        {/* Navigation Editor */}
        <Card className="border-2 border-primary/10">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
                <CardTitle>Bottom Bar Shortcuts</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                    {localNavIds.length} / 4 Active
                </p>
            </div>
            {/* Show Save button if dirty OR if list is invalid (>4 items) */}
            {(isDirty || localNavIds.length > 4) && (
                <Button size="sm" onClick={handleSave} className="animate-pulse">
                    Save Changes
                </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Active List */}
            <div className="space-y-2">
                <Label className="text-xs font-semibold text-primary uppercase tracking-wider">Active (Drag to Order)</Label>
                <div className="space-y-2 bg-muted/30 p-2 rounded-lg min-h-[100px]">
                    {localNavIds.map((id, index) => {
                        const item = NAV_ITEMS.find(i => i.id === id);
                        if(!item) return null;
                        const Icon = item.icon;
                        return (
                            <div 
                                key={id}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragEnter={() => handleDragEnter(index)}
                                onDragOver={(e) => e.preventDefault()}
                                className="flex items-center justify-between p-3 bg-card border rounded-md shadow-sm cursor-move hover:border-primary transition-colors touch-none"
                            >
                                <div className="flex items-center gap-3">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    <Icon className="h-5 w-5 text-primary" />
                                    <span className="font-medium text-sm">{item.label}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => toggleNavItem(id as NavItemId)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )
                    })}
                     {/* Empty Slots */}
                    {Array.from({ length: 4 - localNavIds.length }).map((_, i) => (
                        <div key={i} className="h-12 border-2 border-dashed border-muted rounded-md flex items-center justify-center text-xs text-muted-foreground opacity-50">
                            Empty Slot
                        </div>
                    ))}
                </div>
            </div>

            {/* Available List */}
            <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tap to Add</Label>
                <div className="grid grid-cols-4 gap-2">
                    {NAV_ITEMS.filter(item => !localNavIds.includes(item.id as NavItemId)).map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => toggleNavItem(item.id as NavItemId)}
                                className="flex flex-col items-center justify-center p-2 rounded-lg border border-dashed hover:border-solid hover:border-primary hover:bg-primary/5 transition-all h-20"
                            >
                                <Icon className="h-5 w-5 mb-1 text-muted-foreground" />
                                <span className="text-[10px] font-medium text-muted-foreground truncate w-full text-center">{item.label}</span>
                                <div className="mt-1">
                                    <Plus className="h-3 w-3 text-primary opacity-50" />
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

          </CardContent>
        </Card>

        <Button variant="destructive" className="w-full gap-2 mt-4" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Log Out
        </Button>
      </div>
    </div>
  );
};

export default Settings;