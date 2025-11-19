import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface BulkEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCards: Array<{ id: string; name: string }>;
  onComplete: () => void;
}

export const BulkEditModal = ({ open, onOpenChange, selectedCards, onComplete }: BulkEditModalProps) => {
  const { user } = useAuth();
  const [updateQuantity, setUpdateQuantity] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [updateCondition, setUpdateCondition] = useState(false);
  const [condition, setCondition] = useState<string>("Near Mint");
  const [updateFoil, setUpdateFoil] = useState(false);
  const [isFoil, setIsFoil] = useState(false);
  const [updateForSale, setUpdateForSale] = useState(false);
  const [forSale, setForSale] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBulkUpdate = async () => {
    if (!user || selectedCards.length === 0) return;

    try {
      const batch = writeBatch(db);
      const updates: any = {};

      if (updateQuantity) updates.quantity = quantity;
      if (updateCondition) updates.condition = condition;
      if (updateFoil) updates.is_foil = isFoil;
      if (updateForSale) updates.listed_for_sale = forSale;

      if (Object.keys(updates).length === 0) {
        toast.error("Please select at least one field to update");
        return;
      }

      selectedCards.forEach((card) => {
        const cardRef = doc(db, "users", user.uid, "collection", card.id);
        batch.update(cardRef, updates);
      });

      await batch.commit();
      toast.success(`Updated ${selectedCards.length} cards successfully`);
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error bulk updating cards:", error);
      toast.error("Failed to update cards");
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedCards.length === 0) return;
    const confirm = window.confirm(`Delete ${selectedCards.length} cards from your collection? This cannot be undone.`);
    if (!confirm) return;

    try {
      setIsDeleting(true);
      const batch = writeBatch(db);

      selectedCards.forEach((card) => {
        const cardRef = doc(db, "users", user.uid, "collection", card.id);
        batch.delete(cardRef);
      });

      await batch.commit();
      toast.success(`Deleted ${selectedCards.length} cards`);
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error bulk deleting cards:", error);
      toast.error("Failed to delete cards");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Edit {selectedCards.length} Cards</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="update-quantity"
              checked={updateQuantity}
              onCheckedChange={(checked) => setUpdateQuantity(checked as boolean)}
            />
            <Label htmlFor="update-quantity" className="flex-1">Update Quantity</Label>
            {updateQuantity && (
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-20"
              />
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="update-condition"
              checked={updateCondition}
              onCheckedChange={(checked) => setUpdateCondition(checked as boolean)}
            />
            <Label htmlFor="update-condition" className="flex-1">Update Condition</Label>
            {updateCondition && (
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mint">Mint</SelectItem>
                  <SelectItem value="Near Mint">Near Mint</SelectItem>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Light Played">Light Played</SelectItem>
                  <SelectItem value="Played">Played</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="update-foil"
              checked={updateFoil}
              onCheckedChange={(checked) => setUpdateFoil(checked as boolean)}
            />
            <Label htmlFor="update-foil" className="flex-1">Update Foil Status</Label>
            {updateFoil && (
              <Checkbox
                checked={isFoil}
                onCheckedChange={(checked) => setIsFoil(checked as boolean)}
              />
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="update-for-sale"
              checked={updateForSale}
              onCheckedChange={(checked) => setUpdateForSale(checked as boolean)}
            />
            <Label htmlFor="update-for-sale" className="flex-1">Update Sale Status</Label>
            {updateForSale && (
              <Checkbox
                checked={forSale}
                onCheckedChange={(checked) => setForSale(checked as boolean)}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : `Delete ${selectedCards.length} Cards`}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate}>
              Update {selectedCards.length} Cards
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
