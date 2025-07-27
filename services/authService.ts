// frontend/services/authService.ts
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

// Add 'string' type annotations to the parameters
export const registerUser = (username: string, password: string) => {
  return axios.post(`${API_URL}/register`, { username, password });
};

// Add 'string' type annotations to the parameters
export const loginUser = (username: string, password: string) => {
  // Login endpoint expects form data, not JSON
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  return axios.post(`${API_URL}/login`, formData, {
    headers: { 'Content-Type': 'application/x-w ww-form-urlencoded' },
  });
};