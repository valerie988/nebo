
import axios from 'axios';

const API_URL = "http://192.168.10.115:8000"; 

export const authService = {


login: async (credentials: any) => {
  try {
    const payload = {
      email: credentials.email,    
      password: credentials.password,
      role: credentials.role || "customer" 
    };

    const response = await axios.post(`${API_URL}/auth/login`, payload);
    return response.data;
  } catch (error: any) {
    // This helps you see the actual message instead of [object Object]
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
      const response = await axios.post(`${API_URL}/auth/signup`, {
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