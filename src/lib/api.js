import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the logged-in user's JWT to every outgoing request so the API can
// authenticate and scope the response to the caller's company. Applied to both
// the dedicated `api` instance and the default axios instance (many components
// call `axios` directly).
const attachAuthHeader = (config) => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('arionys_user');
      const token = saved ? JSON.parse(saved)?.token : null;
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore malformed localStorage
    }
  }
  return config;
};

api.interceptors.request.use(attachAuthHeader);
axios.interceptors.request.use(attachAuthHeader);

export const getTransactions = async (filters = {}) => {
  const { data } = await api.get('/transactions', { params: filters });
  return data;
};

export const getStats = async (filters = {}) => {
  const { data } = await api.get('/transactions/stats', { params: filters });
  return data;
};

export const addTransaction = async (transactionData) => {
  const { data } = await api.post('/transactions', transactionData);
  return data;
};

export const approveTransaction = async (approvalData) => {
  const { data } = await api.post('/transactions/approve', approvalData);
  return data;
};

export const exportTransactions = async (companyId) => {
  const { data } = await api.get('/transactions/export', { params: { companyId } });
  return data;
};

export const importTransactions = async (payload) => {
  const { data } = await api.post('/transactions/import', payload);
  return data;
};


export const getAccounts = async (filters = {}) => {
  const { data } = await api.get('/accounts', { params: filters });
  return data;
};

export const addAccount = async (accountData) => {
  const { data } = await api.post('/accounts', accountData);
  return data;
};

export default api;
