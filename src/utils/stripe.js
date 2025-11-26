// src/utils/stripe.js

import { loadStripe } from '@stripe/stripe-js';

// REPLACE THIS with your specific key found in Stripe Dashboard > Developers > API Keys
const stripePromise = loadStripe('pk_live_51RKhZCJqRiYlcnGZJyPeVmRjm8QLYOSrCW0ScjmxocdAJ7psdKTKNsS3JzITCJ61vq9lZNJpm2I6gX2eJgCUrSf100Mi7zWfpn'); 

export const handleCheckout = async (priceId) => {
  const stripe = await stripePromise;
  
  if (!stripe) {
    console.error("Stripe failed to load");
    return;
  }

  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }], 
    mode: 'payment',
    // Make sure these paths exist in your router!
    successUrl: `${window.location.origin}/success`, 
    cancelUrl: `${window.location.origin}/cancel`,
  });

  if (error) {
    console.error('Stripe checkout error:', error);
  }
};