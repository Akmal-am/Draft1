import React,{useEffect,useState} from 'react';
import {Page,Spinner,Avatar} from '../components/common/UI';
import api from '../utils/api';
export default function WorkloadPage(){
  const [users,setUsers]=useState([]);const [tasks,setTasks]=useState([]);const [loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([api.get('/users').catch(()=>({data:[]})),api.get('/tasks')]).then(([u,t])=>{setUsers(u.data);setTasks(t.data);}).finally(()=>setLoading(false));},[]);
  if(loading) return <Page title="Workload"><Spinner/></Page>;
  return <Page title="Team Workload">
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
      {users.map(u=>{
        const ut=tasks.filter(t=>t.assignee_id===u.id&&t.status!=='done');
        const pct=Math.min(100,ut.length*20);
        const color=pct>=80?'var(--danger)':pct>=40?'var(--warning)':'var(--success)';
        const label=pct>=80?'🔴 Overloaded':pct>=40?'🟡 Moderate':'🟢 Available';
        return <div key={u.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'18px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
            <Avatar name={u.name} size={40}/>
            <div><div style={{fontWeight:600,fontSize:'14px'}}>{u.name}</div><div style={{fontSize:'11px',color:'var(--text3)',textTransform:'capitalize'}}>{u.role} · {u.department||'—'}</div></div>
          </div>
          <div style={{marginBottom:'12px'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text3)',marginBottom:'5px'}}><span>{ut.length} active tasks</span><span>{label}</span></div>
            <div style={{height:'8px',background:'var(--surface3)',borderRadius:'99px',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:'99px',transition:'width .4s'}}/>
            </div>
          </div>
          {ut.slice(0,4).map(t=><div key={t.id} style={{fontSize:'12px',color:'var(--text2)',padding:'5px 0',borderTop:'1px solid var(--border)'}}><span style={{color:'var(--text3)',marginRight:'6px',fontSize:'11px'}}>{t.project_name||''}</span>{t.title}</div>)}
          {ut.length>4&&<div style={{fontSize:'11px',color:'var(--text3)',paddingTop:'5px',borderTop:'1px solid var(--border)'}}>+{ut.length-4} more tasks</div>}
          {!ut.length&&<div style={{fontSize:'12px',color:'var(--text3)',textAlign:'center',paddingTop:'8px'}}>No active tasks</div>}
        </div>;
      })}
    </div>
  </Page>;
}
