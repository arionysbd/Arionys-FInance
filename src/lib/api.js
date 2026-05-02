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

export const updateTransaction = async (id, transactionData) => {
  const { data } = await api.put(`/transactions/${id}`, transactionData);
  return data;
};

export const deleteTransaction = async (id, verificationData) => {
  const { data } = await api.delete(`/transactions/${id}`, { data: verificationData });
  return data;
};

export const getFounders = async () => {
  const { data } = await api.get('/founders');
  return data;
};

export const validateFounder = async (verificationData) => {
  const { data } = await api.post('/founders/validate', verificationData);
  return data;
};

export default api;
