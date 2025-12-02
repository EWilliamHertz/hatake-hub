import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";

const Community = () => {
  return (
    <div className="min-h-screen bg-background pb-24 p-4">
      <h1 className="text-2xl font-bold mb-6">Community</h1>
      
      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-4">
          <Card className="text-center p-8 border-dashed">
            <Users className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50"/>
            <h3 className="font-semibold">No friends yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start connecting with other players!</p>
            <Button variant="outline"><UserPlus className="mr-2 h-4 w-4"/> Find Friends</Button>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
           {/* Placeholder for groups */}
           <Card>
             <CardHeader>
               <CardTitle>Hatake Official</CardTitle>
               <CardDescription>The official community group.</CardDescription>
             </CardHeader>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Community;