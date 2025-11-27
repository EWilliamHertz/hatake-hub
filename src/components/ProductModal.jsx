import React, { useState } from 'react';
import { X, ShoppingCart, Plus } from 'lucide-react';
import { handleCheckout } from '../utils/stripe';

// Add onAddToCart to props
const ProductModal = ({ product, isOpen, onClose, onAddToCart }) => {
  const [selectedImage, setSelectedImage] = useState(0);

  if (!isOpen || !product) return null;

  const formatDescription = (text) => {
    if (!text) return null;
    return text.split('*').map((item, index) => (
      <p key={index} className="mb-2 text-sm text-gray-600">
        {index === 0 ? item : `• ${item.trim()}`}
      </p>
    ));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-white rounded-xl shadow-2xl flex flex-col md:flex-row">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT: Image Gallery - Constrained Height */}
        <div className="w-full md:w-1/2 p-6 bg-gray-50 flex flex-col items-center justify-center">
          <div className="relative w-full h-64 md:h-96 mb-4 rounded-lg overflow-hidden bg-white">
            <img 
              src={product.galleryImageUrls?.[selectedImage] || ''} 
              alt={product.name} 
              className="w-full h-full object-contain"
            />
          </div>
          {/* Thumbnails */}
          {product.galleryImageUrls && product.galleryImageUrls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 w-full justify-center">
              {product.galleryImageUrls.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-14 h-14 flex-shrink-0 rounded-md border-2 overflow-hidden ${
                    selectedImage === idx ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt={`View ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Product Info */}
        <div className="w-full md:w-1/2 p-6 flex flex-col">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
          
          <div className="flex items-center justify-between mb-6">
            <span className="text-3xl font-bold text-blue-600">€{product.price.toFixed(2)}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {product.stock > 0 ? `${product.stock} in Stock` : 'Out of Stock'}
            </span>
          </div>

          <div className="prose prose-sm mb-8 flex-grow overflow-y-auto max-h-40">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            {formatDescription(product.description)}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-auto">
            <button
                onClick={() => {
                    onAddToCart(product);
                    onClose(); // Optional: Close modal after adding
                }}
                disabled={product.stock === 0}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
                <Plus className="w-5 h-5" />
                Add to Cart
            </button>

            <button
              onClick={() => handleCheckout(product.stripePriceId)}
              disabled={product.stock === 0}
              className="w-full py-3 bg-black text-white rounded-lg font-bold text-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShoppingCart className="w-5 h-5" />
              {product.stock > 0 ? 'Buy Now' : 'Sold Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;