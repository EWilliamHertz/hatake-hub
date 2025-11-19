import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CardSearchBarProps {
  onSearch: (query: string, game: string) => void;
  loading?: boolean;
}

export const CardSearchBar = ({ onSearch, loading }: CardSearchBarProps) => {
  const [query, setQuery] = useState('');
  const [game, setGame] = useState('magic');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), game);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Select value={game} onValueChange={setGame}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Game" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="magic">Magic</SelectItem>
          <SelectItem value="pokemon">Pokémon</SelectItem>
          <SelectItem value="lorcana">Lorcana</SelectItem>
          <SelectItem value="optcg">One Piece</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for cards..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          disabled={loading}
        />
      </div>

      <Button type="submit" disabled={loading || !query.trim()}>
        Search
      </Button>
    </form>
  );
};
