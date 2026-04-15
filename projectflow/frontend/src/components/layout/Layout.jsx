import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to:'/',            label:'Dashboard',     icon:'🏠', exact:true },
  { to:'/projects',   label:'Projects',      icon:'📁' },
  { to:'/tasks',      label:'Tasks',         icon:'✅' },
  { to:'/kanban',     label:'Kanban Board',  icon:'📋' },
  { to:'/milestones', label:'Milestones',    icon:'🏁' },
  { to:'/workload',   label:'Workload',      icon:'👥' },
  { to:'/approvals',  label:'Approvals',     icon:'✔️' },
  { to:'/team-reports',label:'Team Reports', icon:'📊' },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const initials = user?.name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'??';

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <aside style={{width:'220px',background:'var(--surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'18px 16px 12px',display:'flex',alignItems:'center',gap:'10px',borderBottom:'1px solid var(--border)'}}>
          <div style={{width:'32px',height:'32px',background:'linear-gradient(135deg,var(--accent),var(--accent2))',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>⚡</div>
          <div><div style={{fontSize:'15px',fontWeight:'700'}}>ProjectFlow</div><div style={{fontSize:'10px',color:'var(--text3)'}}>Dept. Tracker v2</div></div>
        </div>
        <nav style={{padding:'10px 8px',flex:1,overflowY:'auto'}}>
          <div style={{fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',padding:'8px 8px 4px'}}>Main</div>
          {NAV.map(item=>(
            <NavLink key={item.to} to={item.to} end={item.exact}
              style={({isActive})=>({display:'flex',alignItems:'center',gap:'10px',padding:'9px 10px',borderRadius:'8px',
                color:isActive?'var(--accent)':'var(--text2)',background:isActive?'rgba(79,110,247,.15)':'transparent',
                fontSize:'13.5px',marginBottom:'2px',transition:'all .15s'})}>
              <span style={{fontSize:'16px',width:'20px',textAlign:'center'}}>{item.icon}</span>{item.label}
            </NavLink>
          ))}
          {isAdmin && <>
            <div style={{fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',padding:'12px 8px 4px'}}>Admin</div>
            <NavLink to="/admin" style={({isActive})=>({display:'flex',alignItems:'center',gap:'10px',padding:'9px 10px',borderRadius:'8px',
              color:isActive?'var(--accent)':'var(--text2)',background:isActive?'rgba(79,110,247,.15)':'transparent',fontSize:'13.5px',marginBottom:'2px'})}>
              <span style={{fontSize:'16px',width:'20px',textAlign:'center'}}>⚙️</span>User Management
            </NavLink>
          </>}
        </nav>
        <div style={{padding:'12px',borderTop:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px',borderRadius:'8px',background:'var(--surface2)'}}>
            <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,var(--accent),var(--accent2))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',color:'#fff',flexShrink:0}}>{initials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'12.5px',fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name}</div>
              <div style={{fontSize:'10px',color:'var(--text3)',textTransform:'capitalize'}}>{user?.role}</div>
            </div>
            <button onClick={()=>{logout();navigate('/login');}} title="Logout"
              style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:'16px',flexShrink:0}}>🚪</button>
          </div>
        </div>
      </aside>
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        <div style={{flex:1,overflowY:'auto'}}><Outlet /></div>
      </div>
    </div>
  );
}
