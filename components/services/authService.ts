const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Types 
export interface LoginPayload {
  email: string;
  password: string;
  role: "farmer" | "customer";
}

export interface FarmerSignupPayload {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  location: string;
  role: "farmer";
}

export interface CustomerSignupPayload {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  role: "customer";
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: "farmer" | "customer";
}

// ─── Helpers
async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail ?? "Something went wrong");
  }
  return data as T;
}

// ─── Auth API calls
export const authService = {
  login: (payload: LoginPayload) =>
    post<AuthResponse>("/auth/login", payload),

  signupFarmer: (payload: FarmerSignupPayload) =>
    post<AuthResponse>("/auth/signup", payload),

  signupCustomer: (payload: CustomerSignupPayload) =>
    post<AuthResponse>("/auth/signup", payload),
};
