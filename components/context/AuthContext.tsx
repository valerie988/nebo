import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type Role = "farmer" | "customer" | null;

interface AuthState {
  token: string | null;
  role: Role;
  user: any | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, role: Role, userData: any) => Promise<void>;
  logout: () => Promise<void>;
  forceLogout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    role: null,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await AsyncStorage.getItem("nebo_token");
        const role = await AsyncStorage.getItem("nebo_role");
        const userStr = await AsyncStorage.getItem("nebo_user");

        setState({
          token,
          role: (role as Role) || null,
          user: userStr ? JSON.parse(userStr) : null,
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to restore session:", error);

        setState({
          token: null,
          role: null,
          user: null,
          isLoading: false,
        });
      }
    };

    restoreSession();
  }, []);

  const login = async (token: string, role: Role, user: any) => {
    try {
      await AsyncStorage.setItem("nebo_token", token);
      await AsyncStorage.setItem("nebo_role", role || "");
      await AsyncStorage.setItem("nebo_user", JSON.stringify(user));

      setState({
        token,
        role,
        user,
        isLoading: false,
      });

      console.log("STATE UPDATED:", {
        token,
        role,
        user,
      });
    } catch (error) {
      console.error("Login storage error:", error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        "nebo_token",
        "nebo_role",
        "nebo_user",
      ]);

      setState({
        token: null,
        role: null,
        user: null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const forceLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        "nebo_token",
        "nebo_role",
        "nebo_user",
      ]);

      setState({
        token: null,
        role: null,
        user: null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Force logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        forceLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
}