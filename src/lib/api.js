import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getTransactions = async (filters = {}) => {
  const { data } = await api.get('/transactions', { params: filters });
  return data;
};

export const getStats = async () => {
  const { data } = await api.get('/transactions/stats');
  return data;
};

export const addTransaction = async (transactionData) => {
  const { data } = await api.post('/transactions', transactionData);
  return data;
};



export const getAccounts = async () => {
  const { data } = await api.get('/accounts');
  return data;
};

export const addAccount = async (accountData) => {
  const { data } = await api.post('/accounts', accountData);
  return data;
};

export default api;
