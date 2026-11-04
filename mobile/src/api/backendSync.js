import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cliente propio, separado de api/client.js a propósito: client.js tiene un
// interceptor que desloguea la app local entera ante un 401 — acá un 401 solo
// significa "contraseña de backend incorrecta", no debe tocar la sesión local.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081/api';
const BACKEND_TOKEN_KEY = 'backendSyncToken';

const backendClient = axios.create({ baseURL: BASE_URL, timeout: 15000 });

const authConfig = async () => {
  const token = await AsyncStorage.getItem(BACKEND_TOKEN_KEY);
  if (!token) throw new Error('Connect to the backend first (Settings)');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const connectToBackend = async (email, password) => {
  try {
    const { data } = await backendClient.post('/auth/login', { email, password });
    await AsyncStorage.setItem(BACKEND_TOKEN_KEY, data.token);
    return data;
  } catch (err) {
    if (err.response?.status !== 401) throw err;
    // No existe esa cuenta en el backend todavía: la creamos.
    const name = email.split('@')[0] || 'Fintrack user';
    const { data } = await backendClient.post('/auth/register', { name, email, password });
    await AsyncStorage.setItem(BACKEND_TOKEN_KEY, data.token);
    return data;
  }
};

export const syncBackupToBackend = async (backup) => {
  const { data } = await backendClient.post('/migration/import-backup', backup, await authConfig());
  return data;
};

// The app categories live in the local database; the backend needs its own copy by name.
export const findOrCreateExpenseCategory = async ({ name, icon, color }) => {
  const config = await authConfig();
  const { data: categories } = await backendClient.get('/categories', config);
  const existing = categories.find((c) => c.type === 'EXPENSE' && c.name === name);
  if (existing) return existing.id;
  const { data } = await backendClient.post('/categories', { name, icon, color, type: 'EXPENSE' }, config);
  return data.id;
};

// The same idempotency key must be reused when the user retries the same receipt.
export const submitReceipt = async (receipt, idempotencyKey) => {
  const config = await authConfig();
  const { data } = await backendClient.post('/receipts', receipt, {
    ...config,
    headers: { ...config.headers, 'Idempotency-Key': idempotencyKey },
  });
  return data;
};

export const isConnectedToBackend = async () => !!(await AsyncStorage.getItem(BACKEND_TOKEN_KEY));
