// API Configuration for OWASP ZAP Backend
import axios from "axios";

// Backend URL - Configure this based on your environment
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const API_KEY =
  import.meta.env.VITE_API_KEY || "your-secret-api-key-change-this";

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 120000, // 120 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Add n8n API key to requests for all scan-related endpoints
apiClient.interceptors.request.use((config) => {
  if (config.url?.startsWith("/api/scan")) {
    config.headers["x-api-key"] = API_KEY;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 503) {
      console.error(
        "Backend service unavailable - ensure OWASP ZAP is running",
      );
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error("Authentication failed - check API key configuration");
    }
    return Promise.reject(error);
  },
);

export const API_BASE_URL = BACKEND_URL;
export const API_KEY_HEADER = API_KEY;

export default apiClient;
