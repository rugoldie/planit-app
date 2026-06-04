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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          created_at: string
          event_id: string
          id: string
          text: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          text: string
          user_id: string
          user_name?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          text?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          created_at: string
          event_id: string
          id: string
          receiver_id: string
          sender_id: string
          text: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          receiver_id: string
          sender_id: string
          text: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_guests: {
        Row: {
          created_at: string
          event_id: string
          id: string
          rsvp_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          rsvp_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          rsvp_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photos: {
        Row: {
          created_at: string
          event_id: string
          id: string
          photo_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          photo_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          photo_url?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          bg_color: string | null
          bg_photo: string | null
          bubble_color: string | null
          bubble_text_color: string | null
          code: string
          created_at: string
          date_time: string | null
          dress_code: string | null
          extra: string | null
          font_style: string | null
          gradient_color: string | null
          host_id: string
          id: string
          location: string | null
          template_name: string | null
          text_size: string | null
          title: string
          updated_at: string
          vibe: string | null
        }
        Insert: {
          bg_color?: string | null
          bg_photo?: string | null
          bubble_color?: string | null
          bubble_text_color?: string | null
          code: string
          created_at?: string
          date_time?: string | null
          dress_code?: string | null
          extra?: string | null
          font_style?: string | null
          gradient_color?: string | null
          host_id: string
          id?: string
          location?: string | null
          template_name?: string | null
          text_size?: string | null
          title?: string
          updated_at?: string
          vibe?: string | null
        }
        Update: {
          bg_color?: string | null
          bg_photo?: string | null
          bubble_color?: string | null
          bubble_text_color?: string | null
          code?: string
          created_at?: string
          date_time?: string | null
          dress_code?: string | null
          extra?: string | null
          font_style?: string | null
          gradient_color?: string | null
          host_id?: string
          id?: string
          location?: string | null
          template_name?: string | null
          text_size?: string | null
          title?: string
          updated_at?: string
          vibe?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: { id: string; requester_id: string; recipient_id: string; status: string; created_at: string }
        Insert: { id?: string; requester_id: string; recipient_id: string; status?: string; created_at?: string }
        Update: { id?: string; requester_id?: string; recipient_id?: string; status?: string; created_at?: string }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
