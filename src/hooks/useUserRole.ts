import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'member' | 'guest' | null;

interface UseUserRoleResult {
  role: UserRole;
  loading: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isGuest: boolean;
  refetch: () => Promise<void>;
}

export function useUserRole(userId: string | null): UseUserRoleResult {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async () => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } else if (data) {
        setRole(data.role as UserRole);
      } else {
        // No role found - treat as member for approved users without explicit role
        setRole('member');
      }
    } catch (err) {
      console.error('Error in useUserRole:', err);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();
  }, [userId]);

  return {
    role,
    loading,
    isAdmin: role === 'admin',
    isMember: role === 'member',
    isGuest: role === 'guest',
    refetch: fetchRole,
  };
}
