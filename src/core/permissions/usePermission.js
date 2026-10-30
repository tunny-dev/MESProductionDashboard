import { canAccessOverview } from '@/constants/appConfig';
import { useAuth } from '@/core/auth/useAuth';

export function usePermission() {
  const { user, isAuthenticated } = useAuth();
  return {
    canAccessOverview: canAccessOverview(user),
    isAuthenticated,
  };
}

export default usePermission;
