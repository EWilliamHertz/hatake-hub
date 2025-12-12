export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      collection_cards: {
        Row: {
          added_at: string | null
          api_id: string
          collector_number: string | null
          condition: string | null
          for_sale: boolean | null
          game: string | null
          id: string
          image_large: string | null
          image_normal: string | null
          image_small: string | null
          is_altered: boolean | null
          is_foil: boolean | null
          is_graded: boolean | null
          is_signed: boolean | null
          language: string | null
          name: string
          notes: string | null
          price_eur: number | null
          price_eur_foil: number | null
          price_last_updated: string | null
          price_usd: number | null
          price_usd_foil: number | null
          purchase_price: number | null
          quantity: number | null
          rarity: string | null
          sale_price: number | null
          sale_quantity: number | null
          set_name: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          api_id: string
          collector_number?: string | null
          condition?: string | null
          for_sale?: boolean | null
          game?: string | null
          id?: string
          image_large?: string | null
          image_normal?: string | null
          image_small?: string | null
          is_altered?: boolean | null
          is_foil?: boolean | null
          is_graded?: boolean | null
          is_signed?: boolean | null
          language?: string | null
          name: string
          notes?: string | null
          price_eur?: number | null
          price_eur_foil?: number | null
          price_last_updated?: string | null
          price_usd?: number | null
          price_usd_foil?: number | null
          purchase_price?: number | null
          quantity?: number | null
          rarity?: string | null
          sale_price?: number | null
          sale_quantity?: number | null
          set_name?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          api_id?: string
          collector_number?: string | null
          condition?: string | null
          for_sale?: boolean | null
          game?: string | null
          id?: string
          image_large?: string | null
          image_normal?: string | null
          image_small?: string | null
          is_altered?: boolean | null
          is_foil?: boolean | null
          is_graded?: boolean | null
          is_signed?: boolean | null
          language?: string | null
          name?: string
          notes?: string | null
          price_eur?: number | null
          price_eur_foil?: number | null
          price_last_updated?: string | null
          price_usd?: number | null
          price_usd_foil?: number | null
          purchase_price?: number | null
          quantity?: number | null
          rarity?: string | null
          sale_price?: number | null
          sale_quantity?: number | null
          set_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          is_group_chat: boolean | null
          last_message: string | null
          participants: string[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_group_chat?: boolean | null
          last_message?: string | null
          participants: string[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_group_chat?: boolean | null
          last_message?: string | null
          participants?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      decks: {
        Row: {
          cards: Json | null
          commander_id: string | null
          created_at: string | null
          description: string | null
          format: string | null
          id: string
          name: string
          sideboard: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cards?: Json | null
          commander_id?: string | null
          created_at?: string | null
          description?: string | null
          format?: string | null
          id?: string
          name: string
          sideboard?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cards?: Json | null
          commander_id?: string | null
          created_at?: string | null
          description?: string | null
          format?: string | null
          id?: string
          name?: string
          sideboard?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          card_id: string
          condition: string | null
          created_at: string | null
          id: string
          is_foil: boolean | null
          notes: string | null
          price: number
          quantity: number | null
          seller_id: string
        }
        Insert: {
          card_id: string
          condition?: string | null
          created_at?: string | null
          id?: string
          is_foil?: boolean | null
          notes?: string | null
          price: number
          quantity?: number | null
          seller_id: string
        }
        Update: {
          card_id?: string
          condition?: string | null
          created_at?: string | null
          id?: string
          is_foil?: boolean | null
          notes?: string | null
          price?: number
          quantity?: number | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "collection_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          sender_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          sender_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          sender_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          items: Json
          status: string | null
          stripe_session_id: string | null
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          items: Json
          status?: string | null
          stripe_session_id?: string | null
          total: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json
          status?: string | null
          stripe_session_id?: string | null
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          content: string
          created_at: string | null
          hashtags: string[] | null
          id: string
          likes: string[] | null
          media_urls: string[] | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          likes?: string[] | null
          media_urls?: string[] | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          likes?: string[] | null
          media_urls?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          gallery_image_urls: string[] | null
          id: string
          name: string
          price: number
          stock: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gallery_image_urls?: string[] | null
          id?: string
          name: string
          price: number
          stock?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gallery_image_urls?: string[] | null
          id?: string
          name?: string
          price?: number
          stock?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_verified_seller: boolean | null
          photo_url: string | null
          seller_rating: number | null
          total_sales: number | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_verified_seller?: boolean | null
          photo_url?: string | null
          seller_rating?: number | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_verified_seller?: boolean | null
          photo_url?: string | null
          seller_rating?: number | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      seller_ratings: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          rating: number
          review: string | null
          seller_id: string
          transaction_id: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          seller_id: string
          transaction_id?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          seller_id?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      trade_offers: {
        Row: {
          created_at: string | null
          from_user_id: string
          id: string
          offered_cards: string[] | null
          offered_cash: number | null
          requested_cards: string[] | null
          requested_cash: number | null
          status: string | null
          to_user_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_user_id: string
          id?: string
          offered_cards?: string[] | null
          offered_cash?: number | null
          requested_cards?: string[] | null
          requested_cash?: number | null
          status?: string | null
          to_user_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_user_id?: string
          id?: string
          offered_cards?: string[] | null
          offered_cash?: number | null
          requested_cards?: string[] | null
          requested_cash?: number | null
          status?: string | null
          to_user_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          api_id: string
          created_at: string | null
          game: string | null
          id: string
          image_url: string | null
          name: string
          user_id: string
        }
        Insert: {
          api_id: string
          created_at?: string | null
          game?: string | null
          id?: string
          image_url?: string | null
          name: string
          user_id: string
        }
        Update: {
          api_id?: string
          created_at?: string | null
          game?: string | null
          id?: string
          image_url?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
