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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      collection_video_reviews: {
        Row: {
          archived_at: string | null
          collection_id: string
          status: string
          video_id: string
        }
        Insert: {
          archived_at?: string | null
          collection_id: string
          status?: string
          video_id: string
        }
        Update: {
          archived_at?: string | null
          collection_id?: string
          status?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_video_reviews_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      collections_videos: {
        Row: {
          contributor_id: string | null
          contributor_identifier: string | null
          created_at: string
          id: string
          name: string
          rome_code: string
          rome_label: string
          videos: Json
        }
        Insert: {
          contributor_id?: string | null
          contributor_identifier?: string | null
          created_at?: string
          id?: string
          name: string
          rome_code?: string
          rome_label?: string
          videos: Json
        }
        Update: {
          contributor_id?: string | null
          contributor_identifier?: string | null
          created_at?: string
          id?: string
          name?: string
          rome_code?: string
          rome_label?: string
          videos?: Json
        }
        Relationships: [
          {
            foreignKeyName: "collections_videos_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          identifier: string
          last_name: string
        }
        Insert: {
          created_at?: string
          first_name: string
          id: string
          identifier: string
          last_name: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          identifier?: string
          last_name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      validated_video_archives: {
        Row: {
          contributor_identifier: string | null
          created_at: string
          id: string
          videos: Json
        }
        Insert: {
          contributor_identifier?: string | null
          created_at?: string
          id?: string
          videos: Json
        }
        Update: {
          contributor_identifier?: string | null
          created_at?: string
          id?: string
          videos?: Json
        }
        Relationships: []
      }
      videos_metiers: {
        Row: {
          channel_title: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          long_link: string
          rome_code: string
          rome_label: string
          summary: string | null
          thumbnail_url: string | null
          title: string
          transcript: string | null
          video_id: string
          watch_link: string
        }
        Insert: {
          channel_title?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          long_link: string
          rome_code: string
          rome_label: string
          summary?: string | null
          thumbnail_url?: string | null
          title: string
          transcript?: string | null
          video_id: string
          watch_link: string
        }
        Update: {
          channel_title?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          long_link?: string
          rome_code?: string
          rome_label?: string
          summary?: string | null
          thumbnail_url?: string | null
          title?: string
          transcript?: string | null
          video_id?: string
          watch_link?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_contributor_videos: {
        Args: { target_identifier: string }
        Returns: number
      }
      archive_one_video: {
        Args: { target_identifier: string; target_video_id: string }
        Returns: number
      }
      archive_validated_videos: { Args: never; Returns: number }
      contributor_letters: { Args: { value: string }; Returns: string }
      current_identifier: { Args: never; Returns: string }
      find_contributor_identifiers: {
        Args: { prefix: string }
        Returns: {
          identifier: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      register_contributor: {
        Args: { first_name: string; last_name: string }
        Returns: string
      }
      restore_one_video: {
        Args: { target_identifier: string; target_video_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
