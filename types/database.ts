export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: 'user' | 'admin'
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: 'user' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: 'user' | 'admin'
          created_at?: string
        }
      }
      scripts: {
        Row: {
          id: string
          title: string
          body: string
          category: string | null
          tags: string[] | null
          is_admin: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          body: string
          category?: string | null
          tags?: string[] | null
          is_admin?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          body?: string
          category?: string | null
          tags?: string[] | null
          is_admin?: boolean
          created_by?: string | null
          created_at?: string
        }
      }
      script_favorites: {
        Row: {
          user_id: string
          script_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          script_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          script_id?: string
          created_at?: string
        }
      }
      resources: {
        Row: {
          id: string
          title: string
          type: 'image' | 'video' | 'pdf'
          storage_path: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          type: 'image' | 'video' | 'pdf'
          storage_path: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          type?: 'image' | 'video' | 'pdf'
          storage_path?: string
          created_by?: string
          created_at?: string
        }
      }
      resources_favorites: {
        Row: {
          user_id: string
          resource_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          resource_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          resource_id?: string
          created_at?: string
        }
      }
    }
  }
}
