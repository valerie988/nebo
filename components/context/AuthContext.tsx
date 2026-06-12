import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { DeviceEventEmitter } from "react-native"; // 1. Import this

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

  // 2. Add the listener for session expiration
  useEffect(() => {
    const listener = DeviceEventEmitter.addListener("session-expired", () => {
      console.log("AuthContext received session-expired event.");
      forceLogout(); // This will clear state and trigger the redirect in RootLayout
    });

    return () => listener.remove();
  }, []);

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
        setState({ token: null, role: null, user: null, isLoading: false });
      }
    };

    restoreSession();
  }, []);

  const login = async (token: string, role: Role, user: any) => {
    await AsyncStorage.setItem("nebo_token", token);
    await AsyncStorage.setItem("nebo_role", role || "");
    await AsyncStorage.setItem("nebo_user", JSON.stringify(user));

    setState({ token, role, user, isLoading: false });
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(["nebo_token", "nebo_role", "nebo_user"]);
    setState({ token: null, role: null, user: null, isLoading: false });
  };

  const forceLogout = async () => {
    // This is called by the listener above
    await AsyncStorage.multiRemove(["nebo_token", "nebo_role", "nebo_user"]);
    setState({ token: null, role: null, user: null, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, forceLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}