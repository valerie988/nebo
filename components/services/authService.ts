import axios from 'axios';
import Constants from 'expo-constants';

// Cleanly connect from app.config.js with a fallback to your current verified IP
const BASE_URL = Constants.expoConfig?.extra?.API_URL;

export const authService = {
  login: async (credentials: any) => {
    try {
      const payload = {
        email: credentials.email,    
        password: credentials.password,
        role: credentials.role || "customer" 
      };

      // Notice we use BASE_URL and append /api/auth/login if your FastAPI router uses the /api prefix
      console.log(`📡 Sending login request to: ${BASE_URL}/api/auth/login`);
      
      const response = await axios.post(`${BASE_URL}/api/auth/login`, payload);
      return response.data;
    } catch (error: any) {
      console.error("❌ Login Error Response Object:", error.response?.data);
      
      const message = error.response?.data?.detail 
        ? (typeof error.response.data.detail === 'string' 
            ? error.response.data.detail 
            : JSON.stringify(error.response.data.detail))
        : error.message;
        
      throw new Error(message);
    }
  },

  signup: async (userData: any) => {
    try {
      console.log(`📡 Sending signup request to: ${BASE_URL}/api/auth/signup`);

      const response = await axios.post(`${BASE_URL}/api/auth/signup`, {
        full_name: userData.full_name,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
        role: userData.role,
        location: userData.location || "N/A", 
      });
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.detail || "Connection to server failed";
      throw new Error(message);
    }
  }
};