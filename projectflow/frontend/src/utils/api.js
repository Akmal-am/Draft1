import axios from 'axios';
const api = axios.create({ baseURL:'/api', timeout:30000 });
api.interceptors.request.use(c=>{ const t=localStorage.getItem('pf_token'); if(t) c.headers.Authorization=`Bearer ${t}`; return c; });
api.interceptors.response.use(r=>r, err=>{ if(err.response?.status===401){ localStorage.removeItem('pf_token'); localStorage.removeItem('pf_user'); window.location.href='/login'; } return Promise.reject(err); });
export default api;
