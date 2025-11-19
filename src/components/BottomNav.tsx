import { Home, Library, Layers, ShoppingBag } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Feed", href: "/", icon: Home },
  { name: "Collection", href: "/collection", icon: Library },
  { name: "Deck Builder", href: "/deck-builder", icon: Layers },
  { name: "Marketplace", href: "/marketplace", icon: ShoppingBag },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border bottom-nav">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <item.icon className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
