import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

interface User {
  role: 'admin' | 'guest';
  token: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasAccess: (requiredRole: 'admin' | 'guest') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        try {
          const response = await axios.get('/api/auth/verify', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          
          if (response.data.valid) {
            setUser({
              role: response.data.role,
              token: storedToken
            });
          } else {
            localStorage.removeItem('authToken');
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('authToken');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await axios.post('/api/auth/login', { password });
      
      if (response.data.success) {
        const { token, role } = response.data;
        
        localStorage.setItem('authToken', token);
        setUser({ role, token });
        
        return { success: true };
      } else {
        return { success: false, message: response.data.message || 'Login failed' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Network error. Please try again.' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const hasAccess = (requiredRole: 'admin' | 'guest'): boolean => {
    if (!user) return false;
    
    // Admin can access everything
    if (user.role === 'admin') return true;
    
    // Guest can only access guest-level content
    if (user.role === 'guest' && requiredRole === 'guest') return true;
    
    return false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      hasAccess
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 