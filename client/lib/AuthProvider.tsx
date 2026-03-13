import React, { createContext, useContext, useEffect, useState } from 'react';

const AUTH_TOKEN_KEY = 'kvk_auth_token';

interface AppUser {
  id: string;
  email: string;
}

interface EmployeeProfile {
  id: string;
  name: string;
  role: 'admin' | 'employee';
  email: string;
  domain_expertise: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  profile: EmployeeProfile | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: 'admin' | 'employee' | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  token: null,
  loading: true,
  signIn: async () => ({ error: "Not initialized", role: null }),
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        if (!response.ok) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setToken(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const body = await response.json();
        const loadedProfile = body?.profile as EmployeeProfile | null;
        if (!loadedProfile) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setToken(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setToken(savedToken);
        setProfile(loadedProfile);
        setUser({ id: loadedProfile.id, email: loadedProfile.email });
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setToken(null);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    void initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.token || !payload?.profile) {
        setLoading(false);
        return { error: payload?.message ?? 'Login failed.', role: null };
      }

      localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
      setToken(payload.token);
      setProfile(payload.profile);
      setUser({ id: payload.profile.id, email: payload.profile.email });
      setLoading(false);
      return { error: null, role: payload.profile.role ?? null };
    } catch (error: any) {
      setLoading(false);
      return { error: error?.message ?? 'Network error during login.', role: null };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
