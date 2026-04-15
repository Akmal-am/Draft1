import React,{createContext,useContext,useState,useEffect} from 'react';
import api from '../utils/api';
const Ctx=createContext(null);
export function AuthProvider({children}){
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('pf_user'));}catch{return null;}});
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const t=localStorage.getItem('pf_token');
    if(t) api.get('/auth/me').then(r=>{setUser(r.data);localStorage.setItem('pf_user',JSON.stringify(r.data));}).catch(()=>{localStorage.removeItem('pf_token');localStorage.removeItem('pf_user');setUser(null);}).finally(()=>setLoading(false));
    else setLoading(false);
  },[]);
  const login=async(email,password)=>{ const r=await api.post('/auth/login',{email,password}); localStorage.setItem('pf_token',r.data.token); localStorage.setItem('pf_user',JSON.stringify(r.data.user)); setUser(r.data.user); return r.data.user; };
  const logout=()=>{ localStorage.removeItem('pf_token'); localStorage.removeItem('pf_user'); setUser(null); };
  return <Ctx.Provider value={{user,login,logout,loading,isAdmin:user?.role==='admin',isManager:['admin','manager'].includes(user?.role)}}>{children}</Ctx.Provider>;
}
export const useAuth=()=>useContext(Ctx);
