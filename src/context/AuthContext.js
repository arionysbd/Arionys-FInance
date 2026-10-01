'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import '@/lib/api'; // installs the axios auth-header interceptor app-wide

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initSession = async () => {
      const savedUser = localStorage.getItem('arionys_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        // Set stale data immediately so the page can render
        setUser(parsed);
        // Then refresh from DB to pick up any role/status changes
        try {
          const { data } = await axios.get('/api/users/me', {
            headers: { Authorization: `Bearer ${parsed.token}` }
          });
          if (data.success) {
            const freshUser = { ...parsed, ...data.data };
            setUser(freshUser);
            localStorage.setItem('arionys_user', JSON.stringify(freshUser));
          }
        } catch {
          // Token expired or invalid — force logout
          localStorage.removeItem('arionys_user');
          setUser(null);
        }
      }
      setLoading(false);
    };
    initSession();
  }, []);

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname === '/login' || pathname === '/signup';
      // Pages that work without signing in: invitation links and magic-link verification
      const isPublicPage = isAuthPage || pathname === '/verify' || pathname?.startsWith('/invite');
      if (!user && !isPublicPage) {
        router.push('/login');
      } else if (user && isAuthPage) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('arionys_user', JSON.stringify(userData));
    router.push('/');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('arionys_user');
    router.push('/login');
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('arionys_user', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
