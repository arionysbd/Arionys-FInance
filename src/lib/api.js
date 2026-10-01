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

<<<<<<< Updated upstream
=======
// --- Employees API ---
export const getEmployees = async (filters = {}) => {
  const { data } = await api.get('/employees', { params: filters });
  return data;
};

export const getEmployee = async (id) => {
  const { data } = await api.get(`/employees/${id}`);
  return data;
};

export const addEmployee = async (employeeData) => {
  const { data } = await api.post('/employees', employeeData);
  return data;
};

export const updateEmployee = async (id, employeeData) => {
  const { data } = await api.patch(`/employees/${id}`, employeeData);
  return data;
};

export const deleteEmployee = async (id) => {
  const { data } = await api.delete(`/employees/${id}`);
  return data;
};

// --- Loans API ---
export const getLoans = async (filters = {}) => {
  const { data } = await api.get('/loans', { params: filters });
  return data;
};

export const getLoan = async (id) => {
  const { data } = await api.get(`/loans/${id}`);
  return data;
};

export const createLoan = async (loanData) => {
  const { data } = await api.post('/loans', loanData);
  return data;
};

export const approveLoan = async (id, status = 'approved') => {
  const { data } = await api.patch(`/loans/${id}/approve`, { status });
  return data;
};

export const disburseLoan = async (id, payload = {}) => {
  const { data } = await api.patch(`/loans/${id}/disburse`, payload);
  return data;
};

export const getLoanRepayments = async (id) => {
  const { data } = await api.get(`/loans/${id}/repayments`);
  return data;
};

export const addLoanRepayment = async (id, repaymentData) => {
  const { data } = await api.post(`/loans/${id}/repayments`, repaymentData);
  return data;
};

// --- Notifications API ---
export const getNotifications = async (filters = {}) => {
  const { data } = await api.get('/notifications', { params: filters });
  return data;
};

export const markNotificationRead = async (id) => {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
};

export const markAllNotificationsRead = async () => {
  const { data } = await api.patch('/notifications/read-all');
  return data;
};

// --- Audit Logs API ---
export const getAuditLogs = async (filters = {}) => {
  const { data } = await api.get('/audit-logs', { params: filters });
  return data;
};

>>>>>>> Stashed changes
export default api;
