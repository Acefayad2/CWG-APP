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
      
      if (error) {
        console.error('Profile query error:', error)
        // Log more details for debugging
        if (error.code === 'PGRST116') {
          console.error('Profile not found for user:', userId)
        }
        throw error
      }
      return data as Profile
    },
    enabled: !!userId,
    retry: 1,
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
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('User creation failed')

      // Profile is automatically created by trigger, but we need to ensure the name is set
      // Wait a moment for the trigger to run
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verify and update profile if name wasn't set by trigger
      if (authData.user.id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', authData.user.id)
          .single()
        
        // If profile exists but name is missing/null, update it
        if (!profileError && profile && (!profile.full_name || profile.full_name.trim() === '')) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', authData.user.id)
          
          if (updateError) {
            console.error('Failed to update profile name:', updateError)
          }
        }
      }

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
    onSuccess: async (data) => {
      // Set session data immediately
      if (data.session) {
        queryClient.setQueryData(['session'], data.session)
      }
      
      // Invalidate and refetch session to ensure it's fresh
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      await queryClient.refetchQueries({ queryKey: ['session'] })
      
      // If we have a user ID, refetch their profile immediately
      if (data.session?.user?.id) {
        await queryClient.invalidateQueries({ queryKey: ['profile', data.session.user.id] })
        await queryClient.refetchQueries({ queryKey: ['profile', data.session.user.id] })
      } else {
        // Invalidate all profile queries
        queryClient.invalidateQueries({ queryKey: ['profile'] })
      }
    },
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // Sign out from Supabase first
      const { error } = await supabase.auth.signOut()
      
      // Clear all queries after sign out (whether successful or not)
      queryClient.clear()
      
      if (error) {
        console.error('Sign out error:', error)
        // Don't throw - we still want to clear local state
        // The navigation will happen regardless
      }
    },
    onSuccess: () => {
      // Queries already cleared in mutationFn
    },
    onError: (error) => {
      console.error('Sign out mutation error:', error)
      // Queries already cleared in mutationFn
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: { full_name?: string } }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: async (data, variables) => {
      // Update the cache immediately with the new data
      queryClient.setQueryData(['profile', variables.userId], data)
      // Also invalidate to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ['profile', variables.userId] })
      await queryClient.refetchQueries({ queryKey: ['profile', variables.userId] })
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
    mutationFn: async ({ userId, makeAdmin = false }: { userId: string; makeAdmin?: boolean }) => {
      const updates: { approval_status: string; role?: string } = {
        approval_status: 'approved',
      }
      
      // If makeAdmin is true, also set role to admin
      if (makeAdmin) {
        updates.role = 'admin'
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
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
