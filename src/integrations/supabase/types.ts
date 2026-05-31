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
      friend_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friend_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friend_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friend_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_chat_messages: {
        Row: {
          content: string
          created_at: string
          game_id: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          game_id: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          game_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_chat_messages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          black_id: string
          black_time_left_ms: number | null
          created_at: string
          fen: string
          id: string
          last_move_at: string | null
          last_move_from: string | null
          last_move_san: string | null
          last_move_to: string | null
          pgn: string
          status: Database["public"]["Enums"]["game_status"]
          time_control: number
          turn: string
          updated_at: string
          white_id: string
          white_time_left_ms: number | null
          winner_id: string | null
        }
        Insert: {
          black_id: string
          black_time_left_ms?: number | null
          created_at?: string
          fen?: string
          id?: string
          last_move_at?: string | null
          last_move_from?: string | null
          last_move_san?: string | null
          last_move_to?: string | null
          pgn?: string
          status?: Database["public"]["Enums"]["game_status"]
          time_control?: number
          turn?: string
          updated_at?: string
          white_id: string
          white_time_left_ms?: number | null
          winner_id?: string | null
        }
        Update: {
          black_id?: string
          black_time_left_ms?: number | null
          created_at?: string
          fen?: string
          id?: string
          last_move_at?: string | null
          last_move_from?: string | null
          last_move_san?: string | null
          last_move_to?: string | null
          pgn?: string
          status?: Database["public"]["Enums"]["game_status"]
          time_control?: number
          turn?: string
          updated_at?: string
          white_id?: string
          white_time_left_ms?: number | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_black_id_fkey"
            columns: ["black_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_white_id_fkey"
            columns: ["white_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaking_queue: {
        Row: {
          created_at: string
          time_control: number
          user_id: string
        }
        Insert: {
          created_at?: string
          time_control?: number
          user_id: string
        }
        Update: {
          created_at?: string
          time_control?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaking_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_rial: number
          authority: string | null
          created_at: string
          games_credited: number
          gateway: string
          id: string
          paid_at: string | null
          ref_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_rial: number
          authority?: string | null
          created_at?: string
          games_credited: number
          gateway?: string
          id?: string
          paid_at?: string | null
          ref_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_rial?: number
          authority?: string | null
          created_at?: string
          games_credited?: number
          gateway?: string
          id?: string
          paid_at?: string | null
          ref_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      pi_payments: {
        Row: {
          amount: number
          created_at: string
          games_credited: number
          id: string
          payment_id: string
          status: string
          txid: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          games_credited: number
          id?: string
          payment_id: string
          status?: string
          txid?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          games_credited?: number
          id?: string
          payment_id?: string
          status?: string
          txid?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_until: string | null
          created_at: string
          draws: number
          id: string
          is_permanently_banned: boolean
          last_free_reset_date: string
          losses: number
          online_games_played: number
          paid_games_remaining: number
          rating: number
          username: string
          warning_count: number
          wins: number
        }
        Insert: {
          avatar_url?: string | null
          banned_until?: string | null
          created_at?: string
          draws?: number
          id: string
          is_permanently_banned?: boolean
          last_free_reset_date?: string
          losses?: number
          online_games_played?: number
          paid_games_remaining?: number
          rating?: number
          username: string
          warning_count?: number
          wins?: number
        }
        Update: {
          avatar_url?: string | null
          banned_until?: string | null
          created_at?: string
          draws?: number
          id?: string
          is_permanently_banned?: boolean
          last_free_reset_date?: string
          losses?: number
          online_games_played?: number
          paid_games_remaining?: number
          rating?: number
          username?: string
          warning_count?: number
          wins?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          context_id: string | null
          created_at: string
          id: string
          reason: string | null
          reported_user_id: string
          reporter_id: string
          type: string
        }
        Insert: {
          context_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reported_user_id: string
          reporter_id: string
          type: string
        }
        Update: {
          context_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reported_user_id?: string
          reporter_id?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_online_game: { Args: { p_user: string }; Returns: Json }
      find_or_join_match:
        | { Args: { p_user: string }; Returns: string }
        | { Args: { p_time_control?: number; p_user: string }; Returns: string }
    }
    Enums: {
      friend_status: "pending" | "accepted" | "blocked"
      game_status:
        | "active"
        | "checkmate"
        | "stalemate"
        | "draw"
        | "resigned"
        | "abandoned"
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
    Enums: {
      friend_status: ["pending", "accepted", "blocked"],
      game_status: [
        "active",
        "checkmate",
        "stalemate",
        "draw",
        "resigned",
        "abandoned",
      ],
    },
  },
} as const
