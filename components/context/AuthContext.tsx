import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

type Role = "farmer" | "customer" | null;

interface AuthState {
  token: string | null;
  role: Role;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, role: Role) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    role: null,
    isLoading: true,
  });
  const router = useRouter();

  // Restore session on boot
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("nebo_token");
        const role = (await AsyncStorage.getItem("nebo_role")) as Role;
        if (token && role) {
          setState({ token, role, isLoading: false });
          router.replace(
            role === "farmer"
              ? "/(tabs)/(farmer-tabs)/home"
              : "/(tabs)/(customer-tabs)/home"
          );
        } else {
          setState((s) => ({ ...s, isLoading: false }));
        }
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    })();
  }, [router]);

  const login = async (token: string, role: Role) => {
    await AsyncStorage.setItem("nebo_token", token);
    await AsyncStorage.setItem("nebo_role", role ?? "");
    setState({ token, role, isLoading: false });
    router.replace(
      role === "farmer"
        ? "/(tabs)/(farmer-tabs)/home"
        : "/(tabs)/(customer-tabs)/home"
    );
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(["nebo_token", "nebo_role"]);
    setState({ token: null, role: null, isLoading: false });
    router.replace("/(auth)/login");
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}