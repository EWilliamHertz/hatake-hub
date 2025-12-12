-- Create user_follows table for following system
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Policies for user_follows
CREATE POLICY "Anyone can view follows" 
ON public.user_follows 
FOR SELECT 
USING (true);

CREATE POLICY "Users can follow others" 
ON public.user_follows 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
ON public.user_follows 
FOR DELETE 
USING (auth.uid() = follower_id);

-- Create seller_ratings table for marketplace trust
CREATE TABLE public.seller_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  transaction_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, transaction_id)
);

-- Enable RLS
ALTER TABLE public.seller_ratings ENABLE ROW LEVEL SECURITY;

-- Policies for seller_ratings
CREATE POLICY "Anyone can view ratings" 
ON public.seller_ratings 
FOR SELECT 
USING (true);

CREATE POLICY "Buyers can create ratings" 
ON public.seller_ratings 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update own ratings" 
ON public.seller_ratings 
FOR UPDATE 
USING (auth.uid() = buyer_id);

-- Add verified_seller and rating columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified_seller BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_rating NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0;

-- Fix notifications INSERT policy - restrict to sender verification
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Users can create notifications with sender verification" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id AND sender_id IS NOT NULL);

-- Create function to update seller rating average
CREATE OR REPLACE FUNCTION public.update_seller_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET seller_rating = (
    SELECT COALESCE(AVG(rating), 0) 
    FROM public.seller_ratings 
    WHERE seller_id = NEW.seller_id
  )
  WHERE id = NEW.seller_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update seller rating
CREATE TRIGGER update_seller_rating_trigger
AFTER INSERT OR UPDATE ON public.seller_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_seller_rating();