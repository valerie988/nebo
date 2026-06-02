import axios from 'axios';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.API_URL || "http://172.20.10.2:8000";

export const authService = {
  login: async (credentials: any) => {
    // Debug: See exactly what is being sent to the server
    console.log("🚀 Payload sending to backend:", JSON.stringify({
        email: credentials.email,    
        password: credentials.password,
        role: credentials.role 
    }, null, 2));

    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: credentials.email,    
        password: credentials.password,
        role: credentials.role || "customer" 
      });
      return response.data;
    } catch (error: any) {
      // The error you see now is triggered here
      throw new Error(error.response?.data?.detail || "Login failed");
    }
  }
};