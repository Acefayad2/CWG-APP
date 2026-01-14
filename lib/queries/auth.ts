import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { Profile } from '@/types'

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!userId,
  })
}

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    },
  })
}

export function useSignUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('User creation failed')

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: fullName,
          role: 'user',
        })
      if (profileError) throw profileError

      return authData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, updates, imageFile, currentPictureUrl }: { userId: string; updates: { full_name?: string }; imageFile?: { uri: string; type: string; name: string }; currentPictureUrl?: string }) => {
      let profilePictureUrl = currentPictureUrl

      // Upload profile picture if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop() || 'jpg'
        const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        
        // Read file using fetch (React Native compatible)
        const response = await fetch(imageFile.uri)
        const blob = await response.blob()

        // Delete old profile picture if exists
        if (currentPictureUrl) {
          try {
            const oldPath = currentPictureUrl.split('/avatars/')[1]?.split('?')[0]
            if (oldPath) {
              await supabase.storage.from('avatars').remove([oldPath])
            }
          } catch (e) {
            // Ignore errors when deleting old picture
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            contentType: imageFile.type,
            upsert: true,
          })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)

        profilePictureUrl = urlData.publicUrl
      }

      // Update profile
      const updateData: { full_name?: string; profile_picture_url?: string } = { ...updates }
      if (profilePictureUrl !== undefined) {
        updateData.profile_picture_url = profilePictureUrl
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', variables.userId] })
    },
  })
}

// Admin approval hooks
export interface PendingUser {
  id: string
  full_name: string | null
  email?: string
  created_at: string
  approval_status: 'pending' | 'approved' | 'rejected'
}

export function usePendingUsers() {
  return useQuery({
    queryKey: ['pending_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Get user emails from auth.users (we can't query auth.users directly with anon key,
      // but we can try to get email from session or use a workaround)
      // For now, return profiles without emails - we'll get them from auth if needed
      return (data || []) as PendingUser[]
    },
  })
}

export function useApproveUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ approval_status: 'approved' })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_users'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useDenyUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      // Set status to rejected (we can't delete from auth.users with anon key)
      const { data, error } = await supabase
        .from('profiles')
        .update({ approval_status: 'rejected' })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      
      // Sign out the denied user (they'll need to sign up again)
      // Note: This requires the user to be signed in, which may not be the case
      // Actual user deletion would require a Supabase Edge Function with service role key
      
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_users'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
