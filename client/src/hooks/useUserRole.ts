import { useUser } from '@clerk/clerk-react';

export const useUserRole = () => {
  const { user } = useUser();
  
  // Check if user is admin based on email or metadata
  const isAdmin = user?.emailAddresses[0]?.emailAddress === 'admin@example.com' ||
                  user?.publicMetadata?.role === 'admin';
  
  return {
    isAdmin,
    user
  };
};