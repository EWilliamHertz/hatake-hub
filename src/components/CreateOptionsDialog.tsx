import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PenSquare, Repeat, Layers, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreateOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePost: () => void;
}

export const CreateOptionsDialog = ({ open, onOpenChange, onCreatePost }: CreateOptionsDialogProps) => {
  const navigate = useNavigate();

  const handleAction = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Create New</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button 
            variant="outline" 
            className="h-24 flex-col gap-2 hover:border-primary hover:text-primary"
            onClick={() => handleAction(onCreatePost)}
          >
            <PenSquare className="h-8 w-8" />
            <span>Post</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-24 flex-col gap-2 hover:border-primary hover:text-primary"
            onClick={() => handleAction(() => navigate('/trades'))}
          >
            <Repeat className="h-8 w-8" />
            <span>Trade</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-24 flex-col gap-2 hover:border-primary hover:text-primary"
            onClick={() => handleAction(() => navigate('/collection'))}
          >
            <Layers className="h-8 w-8" />
            <span>Add Card</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-24 flex-col gap-2 hover:border-primary hover:text-primary"
            onClick={() => handleAction(() => navigate('/community'))}
          >
            <Users className="h-8 w-8" />
            <span>Group</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};