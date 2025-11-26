import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CartDialog } from "@/components/CartDialog";
import { ProductModal } from "@/components/ProductModal"; // New Import
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  galleryImageUrls?: string[];
  category?: string;
  stripePriceId?: string;
  stripeProductId?: string;
}

const Shop = () => {
  const { user } = useAuth();
  const { addToCart, totalItems, items: cartItems } = useCart();
  const navigate = useNavigate();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  
  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const productsRef = collection(db, 'products');
    // Basic query, you can add where('stock', '>', 0) if you want to hide sold out items
    const q = query(productsRef);
    
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const productsData: Product[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          productsData.push({
            id: doc.id,
            name: data.name || '',
            description: data.description,
            price: data.price || 0,
            stock: data.stock || 0,
            galleryImageUrls: Array.isArray(data.galleryImageUrls) ? data.galleryImageUrls : [],
            category: data.category,
            stripePriceId: data.stripePriceId,
            stripeProductId: data.stripeProductId
          });
        });
        setProducts(productsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Shop error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, navigate]);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // Prevent opening the modal
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.galleryImageUrls?.[0],
    });
    toast.success(`${product.name} added to cart`);
  };

  // Logic for the Cart Dialog "Checkout" button
  const handleCartCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setCheckoutLoading(true);
    setCartOpen(false);

    try {
      // NOTE: You must implement this Cloud Function or use client-side logic looping 
      // if you want to checkout multiple items at once.
      // For now, I'm keeping your existing fetch call logic here:
      const lineItems = cartItems.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product?.stripePriceId) {
          throw new Error(`Product ${item.name} is not configured for checkout`);
        }
        return {
          price: product.stripePriceId,
          quantity: item.quantity,
        };
      });

      const response = await fetch('https://us-central1-hatakesocial-88b5e.cloudfunctions.net/createStripeCheckout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems,
          successUrl: window.location.origin + '/shop?success=true',
          cancelUrl: window.location.origin + '/shop?canceled=true',
        }),
      });

      if (!response.ok) throw new Error('Failed to create checkout session');

      const session = await response.json();
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">TCG Shop</h1>
              <p className="text-sm text-muted-foreground">Official HatakeSocial Products</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 relative"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
              {totalItems > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center animate-in zoom-in">
                  {totalItems}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center p-12">
            <p className="text-muted-foreground animate-pulse">Loading products...</p>
          </div>
        ) : error ? (
          <Card className="p-8 text-center border-destructive/20 bg-destructive/5">
            <p className="text-destructive mb-2 font-semibold">Error loading shop</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </Card>
        ) : products.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No products available at the moment.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card 
                key={product.id} 
                className="group overflow-hidden cursor-pointer transition-all hover:shadow-lg border-border/50"
                onClick={() => setSelectedProduct(product)}
              >
                {/* Product Image Area */}
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {product.galleryImageUrls && product.galleryImageUrls.length > 0 ? (
                    <img
                      src={product.galleryImageUrls[0]}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {product.stock === 0 && (
                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                       <span className="text-white font-bold border-2 border-white px-4 py-1">SOLD OUT</span>
                     </div>
                  )}
                  {product.stock > 0 && product.stock < 10 && (
                    <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-600">
                      Low Stock
                    </Badge>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xl font-bold text-primary">
                      €{product.price.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleQuickAdd(e, product)}
                      disabled={product.stock === 0}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Popups */}
      <CartDialog 
        open={cartOpen} 
        onOpenChange={setCartOpen}
        onCheckout={handleCartCheckout}
      />
      
      <ProductModal 
        product={selectedProduct} 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />
    </div>
  );
};

export default Shop;