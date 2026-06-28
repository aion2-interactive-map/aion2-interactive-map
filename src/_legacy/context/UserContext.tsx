import {
  useEffect,
  useState,
  createContext,
  useContext,
  type ReactNode
} from "react";
import {computeBaseUrl} from "@/utils/dataMode.ts";

// ---- Storage key for auth token ----
const TOKEN_KEY = "aion2.jwt";

// ---- Type definitions ----
export type User = {
  id: string;
  email: string;
  name?: string;
  isSuperuser?: boolean;
  // roles?: string[];
};

export type UserContextValue = {
  user: User | null;
  isSuperUser: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string, altchaValue: string) => Promise<boolean>;
  logout: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  refreshUser: () => Promise<void>;
  userModalMode: "login" | "register";
  setUserModalMode: (mode: "login" | "register") => void;
  userModalOpen: boolean;
  setUserModalOpen: (open: boolean) => void;
};

// ---- Context ----
const UserContext = createContext<UserContextValue | undefined>(undefined);

// ===============================================================
//                        Provider
// ===============================================================
export function UserProvider({children}: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [userModalMode, setUserModalMode] = useState<"login" | "register">("login");
  const [userModalOpen, setUserModalOpen] = useState(false);

  // Load user automatically once token exists
  useEffect(() => {
    if (!token) return;
    refreshUser();
  }, [token]);

  // ---------------------------------------------------------------
  // 🟢 Login — calls backend, stores JWT
  // ---------------------------------------------------------------
  async function login(email: string, password: string): Promise<boolean> {
    try {
      // TODO replace with actual API path
      const body = new URLSearchParams();
      body.append("grant_type", "password");
      body.append("username", email);
      body.append("password", password);

      const res = await fetch(computeBaseUrl() + "/auth/jwt/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!res.ok) return false;

      const data = await res.json(); // Expected to contain { token: string }
      if (!data.access_token) return false;

      localStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);

      await refreshUser(); // fetch user profile after login
      return true;

    } catch (err) {
      console.error("Login failed:", err);
      return false;
    }
  }

  async function register(email: string, password: string, name: string, altchaValue: string): Promise<boolean> {
    try {
      const res = await fetch(computeBaseUrl() + "/auth/register?altcha=" + altchaValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          name
        }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      console.log("Register response:", data);
      return data?.errorCode === "Success";
    } catch (err) {
      console.error("Register failed:", err);
      return false;
    }
  }

  // ---------------------------------------------------------------
  // 🟢 Authenticated fetch wrapper
  // ---------------------------------------------------------------
  async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    return fetch(computeBaseUrl() + url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: token ? `Bearer ${token}` : "",
      }
    });
  }

  // ---------------------------------------------------------------
  // 🟡 Load user info using token
  // ---------------------------------------------------------------
  async function refreshUser(): Promise<void> {
    if (!token) return;

    try {
      // TODO replace with real backend route
      const res = await fetchWithAuth("/users/me");

      if (!res.ok) throw new Error("Failed retrieving session");

      const data = await res.json();
      if (!data.id) {
        throw new Error("Invalid user data: missing id");
      }
      setUser(data);

    } catch (err) {
      console.warn("Invalid token, clearing...", err);
      logout();
    }
  }

  // ---------------------------------------------------------------
  // 🔴 Logout — clear everything
  // ---------------------------------------------------------------
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }


  return (
    <UserContext.Provider value={{
      user, isSuperUser: !!user?.isSuperuser, token, login, logout, register,
      fetchWithAuth, refreshUser,
      userModalMode, setUserModalMode,
      userModalOpen, setUserModalOpen,
    }}>
      {children}
    </UserContext.Provider>
  );
}


// ===============================================================
//                         Hook API
// ===============================================================
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
