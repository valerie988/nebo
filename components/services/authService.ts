import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

const BASE_URL =
  Constants.expoConfig?.extra?.API_URL 
const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
});

export const authService = {
  login: async (credentials: any) => {
    const { data } = await apiClient.post(
      "/auth/login",
      credentials
    );

    return data;
  },
  signup: async (userData: any) => {
    const { data } = await apiClient.post("/auth/signup", userData);
    return data;
  },
};

// Automatically attach token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("nebo_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired sessions
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove([
        "nebo_token",
        "nebo_role",
        "nebo_user",
      ]);

      console.log("Session expired. User should be logged out.");
    }

    return Promise.reject(error);
  }
);

export default apiClient;