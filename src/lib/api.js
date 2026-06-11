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
