export type UserRole = 'buyer' | 'seller' | 'both' | 'agent'
export type PropertyType = 'apartment' | 'house' | 'ph' | 'commercial'
export type Currency = 'ARS' | 'USD'
export type Urgency = 'high' | 'medium' | 'low'
export type ListingStatus = 'active' | 'inactive'
export type SellerPropertyStatus = 'draft' | 'active' | 'sold'
export type AgentClientStatus = 'active' | 'inactive'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          phone: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          phone?: string | null
          role: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string | null
          phone?: string | null
          role?: UserRole
          updated_at?: string
        }
      }
      agent_clients: {
        Row: {
          id: string
          agent_id: string
          client_id: string
          status: AgentClientStatus
          created_at: string
        }
        Insert: {
          agent_id: string
          client_id: string
          status?: AgentClientStatus
        }
        Update: {
          status?: AgentClientStatus
        }
      }
      search_preferences: {
        Row: {
          id: string
          user_id: string
          neighborhood: string | null
          city: string | null
          property_type: PropertyType | null
          min_m2: number | null
          max_m2: number | null
          min_rooms: number | null
          max_rooms: number | null
          min_bathrooms: number | null
          max_bathrooms: number | null
          min_price: number | null
          max_price: number | null
          currency: Currency
          amenities: Record<string, boolean> | null
          active: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          neighborhood?: string | null
          city?: string | null
          property_type?: PropertyType | null
          min_m2?: number | null
          max_m2?: number | null
          min_rooms?: number | null
          max_rooms?: number | null
          min_bathrooms?: number | null
          max_bathrooms?: number | null
          min_price?: number | null
          max_price?: number | null
          currency?: Currency
          amenities?: Record<string, boolean> | null
          active?: boolean
        }
        Update: Partial<Database['public']['Tables']['search_preferences']['Insert']>
      }
      property_listings: {
        Row: {
          id: string
          portal: string
          external_id: string
          title: string
          description: string | null
          price: number | null
          currency: string | null
          m2_total: number | null
          m2_covered: number | null
          rooms: number | null
          bathrooms: number | null
          parking: number | null
          address: string | null
          neighborhood: string | null
          city: string | null
          latitude: number | null
          longitude: number | null
          amenities: Record<string, boolean> | null
          images: string[] | null
          url: string
          listed_date: string | null
          last_seen: string
          status: ListingStatus
          raw_data: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          portal: string
          external_id: string
          title: string
          description?: string | null
          price?: number | null
          currency?: string | null
          m2_total?: number | null
          m2_covered?: number | null
          rooms?: number | null
          bathrooms?: number | null
          parking?: number | null
          address?: string | null
          neighborhood?: string | null
          city?: string | null
          latitude?: number | null
          longitude?: number | null
          amenities?: Record<string, boolean> | null
          images?: string[] | null
          url: string
          listed_date?: string | null
          last_seen?: string
          status?: ListingStatus
          raw_data?: Record<string, unknown> | null
        }
        Update: Partial<Database['public']['Tables']['property_listings']['Insert']>
      }
      seller_properties: {
        Row: {
          id: string
          seller_id: string
          title: string
          description: string | null
          address: string
          neighborhood: string
          m2_total: number
          m2_covered: number | null
          rooms: number
          bathrooms: number
          parking: number | null
          amenities: Record<string, boolean> | null
          target_price_min: number | null
          target_price_max: number | null
          currency: Currency
          urgency: Urgency
          status: SellerPropertyStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          seller_id: string
          title: string
          description?: string | null
          address: string
          neighborhood: string
          m2_total: number
          m2_covered?: number | null
          rooms: number
          bathrooms: number
          parking?: number | null
          amenities?: Record<string, boolean> | null
          target_price_min?: number | null
          target_price_max?: number | null
          currency?: Currency
          urgency?: Urgency
          status?: SellerPropertyStatus
        }
        Update: Partial<Database['public']['Tables']['seller_properties']['Insert']>
      }
      price_analyses: {
        Row: {
          id: string
          property_id: string
          analyzed_at: string
          comparables: unknown[] | null
          price_per_m2_avg: number | null
          price_per_m2_min: number | null
          price_per_m2_max: number | null
          estimated_price_min: number | null
          estimated_price_max: number | null
          confidence_score: number | null
          observations: string | null
        }
        Insert: {
          property_id: string
          analyzed_at?: string
          comparables?: unknown[] | null
          price_per_m2_avg?: number | null
          price_per_m2_min?: number | null
          price_per_m2_max?: number | null
          estimated_price_min?: number | null
          estimated_price_max?: number | null
          confidence_score?: number | null
          observations?: string | null
        }
        Update: Partial<Database['public']['Tables']['price_analyses']['Insert']>
      }
      property_opportunities: {
        Row: {
          id: string
          listing_id: string
          preference_id: string
          match_score: number
          opportunity_score: number
          notified_at: string | null
          created_at: string
        }
        Insert: {
          listing_id: string
          preference_id: string
          match_score: number
          opportunity_score: number
          notified_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['property_opportunities']['Insert']>
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          listing_id: string | null
          content: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          sender_id: string
          receiver_id: string
          listing_id?: string | null
          content: string
          read_at?: string | null
        }
        Update: {
          read_at?: string | null
        }
      }
    }
  }
}
