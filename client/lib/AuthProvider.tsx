import React, { createContext, useContext, useEffect, useState } from "react";
import { EMPLOYEE_PROFILE_ROLES } from "../../shared/appConstants";

const AUTH_TOKEN_KEY = "kvk_auth_token";
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();

function apiUrl(path: string) {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

interface AppUser {
  id: string;
  email: string;
  name: string;
  role: string;
  domain?: string | null;
  contact?: string;
  dob?: string;
  gender?: string;
  address?: string;
  domain_expertise?: string | null;
  profile_photo?: string | null;
  profile_photo_updated_at?: string | null;
  created_at?: string;
}

interface EmployeeProfile extends AppUser {
  role: (typeof EMPLOYEE_PROFILE_ROLES)[number];
}

interface AuthContextType {
  user: AppUser | null;
  profile: EmployeeProfile | null;
  token: string | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; role: "admin" | "employee" | null }>;
  signOut: () => Promise<void>;
  updateProfile: (nextProfile: Partial<EmployeeProfile>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  token: null,
  loading: true,
  signIn: async () => ({ error: "Not initialized", role: null }),
  signOut: async () => {},
  updateProfile: () => {},
});

function toAppUser(profile: EmployeeProfile): AppUser {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    domain: profile.domain ?? null,
    contact: profile.contact,
    dob: profile.dob,
    gender: profile.gender,
    address: profile.address,
    domain_expertise: profile.domain_expertise ?? null,
    profile_photo: profile.profile_photo ?? null,
    profile_photo_updated_at: profile.profile_photo_updated_at ?? null,
    created_at: profile.created_at,
  };
}

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
        const response = await fetch(apiUrl("/api/auth/profile"), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
          credentials: "include",
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
        setUser(toAppUser(loadedProfile));
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
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.token || !payload?.profile) {
        setLoading(false);
        return { error: payload?.message ?? "Login failed.", role: null };
      }

      localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
      setToken(payload.token);
      setProfile(payload.profile);
      setUser(toAppUser(payload.profile));
      setLoading(false);
      return { error: null, role: payload.profile.role ?? null };
    } catch (error: any) {
      setLoading(false);
      return {
        error: error?.message ?? "Network error during login.",
        role: null,
      };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = (nextProfile: Partial<EmployeeProfile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...nextProfile } as EmployeeProfile;
      return merged;
    });

    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...nextProfile,
        id: nextProfile.id ?? prev.id,
        role: nextProfile.role ?? prev.role,
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, token, loading, signIn, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
