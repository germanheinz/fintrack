import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let navigationRef = null;

export const setNavigationRef = (ref) => {
  navigationRef = ref;
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'user']);
      // On web, force a hard reload to the login screen
      if (typeof window !== 'undefined') {
        window.location.reload();
      } else if (navigationRef?.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: 'Auth' }] });
      }
    }
    return Promise.reject(error);
  }
);

export default client;
