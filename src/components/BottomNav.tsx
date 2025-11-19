import { Home, Library, Layers, ShoppingBag, Store } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const navigation = [
  { name: "Feed", href: "/", icon: Home },
  { name: "Collection", href: "/collection", icon: Library },
  { name: "Decks", href: "/deck-builder", icon: Layers },
  { name: "Market", href: "/marketplace", icon: ShoppingBag },
  { name: "Shop", href: "/shop", icon: Store },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border bottom-nav">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-colors px-1"
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
