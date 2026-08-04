/**
 * Generert fra databasen med Supabase MCP (generate_typescript_types).
 * Kjør genereringen på nytt hvis du endrer skjemaet – ikke rediger for hånd.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      projects: {
        Row: {
          created_at: string
          current_round_index: number
          id: string
          name: string
          notes: string
          photo_path: string | null
          stopwatch_accumulated: number
          stopwatch_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_round_index?: number
          id?: string
          name?: string
          notes?: string
          photo_path?: string | null
          stopwatch_accumulated?: number
          stopwatch_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_round_index?: number
          id?: string
          name?: string
          notes?: string
          photo_path?: string | null
          stopwatch_accumulated?: number
          stopwatch_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rounds: {
        Row: {
          created_at: string
          id: string
          pattern: string
          position: number
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pattern?: string
          position?: number
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pattern?: string
          position?: number
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      row_counter: {
        Row: {
          current_accumulated: number
          current_started_at: string | null
          row_count: number
          total_accumulated: number
          total_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          current_accumulated?: number
          current_started_at?: string | null
          row_count?: number
          total_accumulated?: number
          total_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          current_accumulated?: number
          current_started_at?: string | null
          row_count?: number
          total_accumulated?: number
          total_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      yarns: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
          weight: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id: string
          weight?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          weight?: string
        }
        Relationships: []
      }
      yarn_colors: {
        Row: {
          code: string
          created_at: string
          id: string
          project_id: string | null
          skeins: number
          user_id: string
          yarn_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          id?: string
          project_id?: string | null
          skeins?: number
          user_id: string
          yarn_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          project_id?: string | null
          skeins?: number
          user_id?: string
          yarn_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yarn_colors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yarn_colors_yarn_id_fkey"
            columns: ["yarn_id"]
            isOneToOne: false
            referencedRelation: "yarns"
            referencedColumns: ["id"]
          },
        ]
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
