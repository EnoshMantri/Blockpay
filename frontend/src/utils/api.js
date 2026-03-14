import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('blockpay_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

export const settlementApi = {
  send: (data) => api.post('/settlement/send', data),
  simulate: (data) => api.post('/settlement/simulate', data),
  recordOnchain: (data) => api.post('/settlement/record-onchain', data),
  getById: (id) => api.get(`/settlement/${id}`),
  getAll: (params) => api.get('/settlement', { params }),
  getStats: () => api.get('/settlement/stats/overview'),
  deposit: (data) => api.post('/settlement/deposit', data),
  getBalance: (address) => api.get(`/settlement/balance/${address}`),
}


export const complianceApi = {
  getAll: () => api.get('/compliance/wallets'),
  getWallet: (address) => api.get(`/compliance/wallet/${address}`),
  whitelist: (data) => api.post('/compliance/whitelist', data),
  bulkWhitelist: (data) => api.post('/compliance/bulk-whitelist', data),
  blacklist: (data) => api.post('/compliance/blacklist', data),
  removeBlacklist: (data) => api.post('/compliance/remove-blacklist', data),
  setLimit: (data) => api.post('/compliance/set-limit', data),
  getRiskScore: (address) => api.post(`/compliance/risk-score/${address}`),
}

export const auditApi = {
  getLogs: (params) => api.get('/audit/logs', { params }),
  getByWallet: (address) => api.get(`/audit/wallet/${address}`),
}

export const walletApi = {
  getInfo: (address) => api.get(`/wallet/${address}/balance`),
  getTransactions: (address) => api.get(`/wallet/${address}/transactions`),
}

export const analyticsApi = {
  getVolume: () => api.get('/analytics/volume'),
  getFees: () => api.get('/analytics/fees'),
  getCorridors: () => api.get('/analytics/corridors'),
  getCompliance: () => api.get('/analytics/compliance'),
}

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
}

export default api
