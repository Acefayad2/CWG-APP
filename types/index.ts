import { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Script = Database['public']['Tables']['scripts']['Row']
export type ScriptInsert = Database['public']['Tables']['scripts']['Insert']
export type ScriptUpdate = Database['public']['Tables']['scripts']['Update']
export type ScriptFavorite = Database['public']['Tables']['script_favorites']['Row']
export type Resource = Database['public']['Tables']['resources']['Row']
export type ResourceInsert = Database['public']['Tables']['resources']['Insert']
export type ResourceFavorite = Database['public']['Tables']['resources_favorites']['Row']

export interface Contact {
  id: string
  name: string
  phoneNumbers?: Array<{ number: string; label: string }>
}

export interface ScriptWithFavorite extends Script {
  is_favorite?: boolean
}

export interface ResourceWithFavorite extends Resource {
  is_favorite?: boolean
  url?: string
}
