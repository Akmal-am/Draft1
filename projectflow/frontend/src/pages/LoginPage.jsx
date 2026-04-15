import React,{useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';

export default function LoginPage(){
  const {login,user}=useAuth();
  const navigate=useNavigate();
  const [form,setForm]=useState({email:'',password:''});
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  if(user){navigate('/');return null;}

  const handleSubmit=async e=>{
    e.preventDefault();setError('');setLoading(true);
    try{ await login(form.email,form.password); navigate('/'); }
    catch(err){ setError(err.response?.data?.error||'Login failed. Check credentials.'); }
    finally{ setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:'20px'}}>
      <div style={{width:'100%',maxWidth:'400px'}}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div style={{width:'56px',height:'56px',background:'linear-gradient(135deg,var(--accent),var(--accent2))',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',margin:'0 auto 16px'}}>⚡</div>
          <h1 style={{fontSize:'24px',fontWeight:'700',marginBottom:'6px'}}>ProjectFlow</h1>
          <p style={{color:'var(--text3)',fontSize:'14px'}}>Internal Department Tracker</p>
        </div>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'14px',padding:'32px'}}>
          <h2 style={{fontSize:'18px',fontWeight:'700',marginBottom:'24px'}}>Sign In</h2>
          {error&&<div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',color:'var(--danger)',fontSize:'13.5px'}}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'12px',fontWeight:'600',color:'var(--text2)',marginBottom:'6px'}}>Email Address</label>
              <input type="email" required value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="you@company.com"
                style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--text)',padding:'10px 14px',fontSize:'14px',outline:'none'}}/>
            </div>
            <div style={{marginBottom:'24px'}}>
              <label style={{display:'block',fontSize:'12px',fontWeight:'600',color:'var(--text2)',marginBottom:'6px'}}>Password</label>
              <input type="password" required value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••"
                style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--text)',padding:'10px 14px',fontSize:'14px',outline:'none'}}/>
            </div>
            <button type="submit" disabled={loading}
              style={{width:'100%',background:'var(--accent)',color:'#fff',border:'none',borderRadius:'8px',padding:'11px',fontSize:'14px',fontWeight:'600',cursor:'pointer',opacity:loading?.7:1}}>
              {loading?'Signing in...':'Sign In'}
            </button>
          </form>
        </div>
        <p style={{textAlign:'center',marginTop:'20px',fontSize:'12px',color:'var(--text3)'}}>Contact your admin to get access</p>
      </div>
    </div>
  );
}
