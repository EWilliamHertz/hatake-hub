import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Search, MapPin, MessageCircle, Calendar, Loader2, User } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
}

interface LocalGameStore {
  id: string;
  name: string;
  location: string;
  members: number;
  description: string;
  nextEvent?: string;
}

// Mock LGS data
const mockGroups: LocalGameStore[] = [
  {
    id: "1",
    name: "Hatake Official",
    location: "Online",
    members: 1247,
    description: "The official Hatake community group for all TCG enthusiasts.",
    nextEvent: "Weekly Draft Night - Friday 7PM"
  },
  {
    id: "2",
    name: "Copenhagen Card Club",
    location: "Copenhagen, Denmark",
    members: 89,
    description: "Local MTG & Pokémon players in Copenhagen. Weekly meetups!",
    nextEvent: "Modern Monday - Dec 4th"
  },
  {
    id: "3",
    name: "Nordic TCG Alliance",
    location: "Scandinavia",
    members: 312,
    description: "Cross-country TCG community for Nordic players.",
    nextEvent: "Regional Championship Prep"
  },
  {
    id: "4",
    name: "Dragon's Lair Gaming",
    location: "Stockholm, Sweden",
    members: 156,
    description: "Your friendly local game store community.",
    nextEvent: "Pokémon League Cup - Dec 10th"
  },
  {
    id: "5",
    name: "The Gathering Place",
    location: "Oslo, Norway",
    members: 78,
    description: "Casual and competitive Magic players welcome!",
    nextEvent: "Commander Night - Every Wednesday"
  }
];

const Community = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const searchUsers = async () => {
    if (!user) return;
    setLoading(true);
    setHasSearched(true);
    
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, limit(100));
      const snapshot = await getDocs(q);
      
      const userList: UserProfile[] = [];
      snapshot.forEach(doc => {
        if (doc.id !== user.uid) {
          userList.push({ uid: doc.id, ...doc.data() } as UserProfile);
        }
      });
      setUsers(userList);
    } catch (error) {
      console.error("Failed to search users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchUsers();
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const lower = searchQuery.toLowerCase();
    return (
      u.displayName?.toLowerCase().includes(lower) || 
      u.email?.toLowerCase().includes(lower)
    );
  });

  const startChat = (userId: string) => {
    navigate(`/messenger?chat=${userId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 p-4">
      <h1 className="text-2xl font-bold mb-6">Community</h1>
      
      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        {/* Friends Tab */}
        <TabsContent value="friends" className="space-y-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users by name or email..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
              {loading ? "" : "Find"}
            </Button>
          </form>

          {/* User Results */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !hasSearched ? (
            <Card className="text-center p-8 border-dashed">
              <Users className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50"/>
              <h3 className="font-semibold">Find Friends</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click "Find" to search for other players in the community!
              </p>
            </Card>
          ) : filteredUsers.length === 0 ? (
            <Card className="text-center p-8 border-dashed">
              <Users className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50"/>
              <h3 className="font-semibold">No users found</h3>
              <p className="text-sm text-muted-foreground">
                Try a different search term
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map(u => (
                <Card key={u.uid} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={u.photoURL} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{u.displayName || "Unknown User"}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => startChat(u.uid)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          {mockGroups.map(group => (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {group.location}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {group.members.toLocaleString()}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{group.description}</p>
                {group.nextEvent && (
                  <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{group.nextEvent}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" variant="default">
                    Join Group
                  </Button>
                  <Button variant="outline">
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Community;
