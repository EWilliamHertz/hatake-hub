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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Listen to products in real-time
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('stock', '>', 0));
    
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

  const handleAddToCart = (product: Product) => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.galleryImageUrls?.[0],
    });
    toast.success(`${product.name} added to cart`);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setCheckoutLoading(true);
    setCartOpen(false);

    try {
      // Create line items for Stripe from cart
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

      // Call Firebase function for Stripe checkout
      const response = await fetch('https://us-central1-hatakesocial-88b5e.cloudfunctions.net/createStripeCheckout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lineItems,
          successUrl: window.location.origin + '/shop?success=true',
          cancelUrl: window.location.origin + '/shop?canceled=true',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const session = await response.json();
      
      if (session.error) {
        throw new Error(session.error);
      }

      // Redirect to Stripe Checkout
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">TCG Shop</h1>
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
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                  {totalItems}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading products...</p>
          </Card>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive mb-2">Error loading shop</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </Card>
        ) : products.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No products available</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                {/* Product Image */}
                <div className="aspect-square bg-muted relative">
                  {product.galleryImageUrls && product.galleryImageUrls.length > 0 ? (
                    <img
                      src={product.galleryImageUrls[0]}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {product.stock < 10 && (
                    <Badge className="absolute top-2 right-2" variant="destructive">
                      Low Stock
                    </Badge>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {product.stock} available
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      ${product.price.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(product)}
                      disabled={checkoutLoading}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CartDialog 
        open={cartOpen} 
        onOpenChange={setCartOpen}
        onCheckout={handleCheckout}
      />
    </div>
  );
};

export default Shop;
