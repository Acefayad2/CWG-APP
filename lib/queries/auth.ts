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
  role?: 'user' | 'admin'
}

export interface AllUser extends PendingUser {
  role: 'user' | 'admin'
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

export function useAllUsers() {
  return useQuery({
    queryKey: ['all_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      return (data || []) as AllUser[]
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
      queryClient.invalidateQueries({ queryKey: ['all_users'] })
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
      queryClient.invalidateQueries({ queryKey: ['all_users'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ 
      userId, 
      approval_status, 
      role 
    }: { 
      userId: string
      approval_status?: 'pending' | 'approved' | 'rejected'
      role?: 'user' | 'admin'
    }) => {
      // If status is being set to rejected, delete all user data
      if (approval_status === 'rejected') {
        console.log('Rejecting user - deleting all data for user:', userId)
        
        // Delete user contacts
        const { error: contactsError } = await supabase
          .from('user_contacts')
          .delete()
          .eq('user_id', userId)
        if (contactsError) console.error('Error deleting contacts:', contactsError)
        
        // Delete contact history
        const { error: historyError } = await supabase
          .from('contact_history')
          .delete()
          .eq('user_id', userId)
        if (historyError) console.error('Error deleting contact history:', historyError)
        
        // Delete script favorites
        const { error: scriptFavsError } = await supabase
          .from('script_favorites')
          .delete()
          .eq('user_id', userId)
        if (scriptFavsError) console.error('Error deleting script favorites:', scriptFavsError)
        
        // Delete resource favorites
        const { error: resourceFavsError } = await supabase
          .from('resources_favorites')
          .delete()
          .eq('user_id', userId)
        if (resourceFavsError) console.error('Error deleting resource favorites:', resourceFavsError)
        
        // Delete resources created by user
        const { error: resourcesError } = await supabase
          .from('resources')
          .delete()
          .eq('created_by', userId)
        if (resourcesError) console.error('Error deleting resources:', resourcesError)
        
        // Delete scripts created by user (non-admin scripts)
        const { error: scriptsError } = await supabase
          .from('scripts')
          .delete()
          .eq('created_by', userId)
        if (scriptsError) console.error('Error deleting scripts:', scriptsError)
        
        // Finally, delete the profile
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId)
        
        if (profileError) {
          console.error('Error deleting profile:', profileError)
          throw profileError
        }
        
        console.log('User and all data deleted successfully')
        return { id: userId, approval_status: 'rejected', deleted: true }
      } else {
        // Normal update for other statuses
        const updates: { approval_status?: string; role?: string } = {}
        
        if (approval_status !== undefined) {
          updates.approval_status = approval_status
        }
        
        if (role !== undefined) {
          updates.role = role
        }
        
        if (Object.keys(updates).length === 0) {
          throw new Error('No updates provided')
        }
        
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select()
          .single()
        
        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_users'] })
      queryClient.invalidateQueries({ queryKey: ['all_users'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useRemoveUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      // Delete the profile - this will effectively remove the user from the app
      // The auth.users record will remain, but without a profile they can't access the app
      // They'll need to sign up again to get a new profile
      console.log('Attempting to delete profile for user:', userId)
      
      // First, verify we're an admin
      const { data: currentUser } = await supabase.auth.getUser()
      console.log('Current user:', currentUser?.user?.id)
      
      if (currentUser?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.user.id)
          .single()
        console.log('Current user profile:', profile)
        if (profile?.role !== 'admin') {
          throw new Error('Only admins can remove users')
        }
      }
      
      // Try to delete
      const { data, error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
        .select()
      
      if (error) {
        console.error('Delete profile error:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', JSON.stringify(error, null, 2))
        
        // Provide more helpful error messages
        if (error.code === '42501') {
          throw new Error('Permission denied. Make sure the RLS policy "Admins can delete profiles" is set up in Supabase.')
        } else if (error.code === 'PGRST116') {
          throw new Error('User profile not found')
        } else {
          throw new Error(error.message || `Failed to delete profile: ${error.code || 'Unknown error'}`)
        }
      }
      
      if (!data || data.length === 0) {
        console.warn('Delete returned no data - profile may not exist or was already deleted')
        // Still consider it success if no error was thrown
      }
      
      console.log('Profile deleted successfully:', data)
      return { success: true, data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_users'] })
      queryClient.invalidateQueries({ queryKey: ['all_users'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
