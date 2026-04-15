import React,{useEffect,useState} from 'react';
import {Page,Priority,Spinner,toast} from '../components/common/UI';
import api from '../utils/api';
const COLS=[{key:'pending',label:'📋 Pending',color:'var(--warning)'},{key:'active',label:'⚡ Active',color:'var(--success)'},{key:'review',label:'👁 Review',color:'var(--info)'},{key:'done',label:'✅ Done',color:'var(--text3)'}];
export default function KanbanPage(){
  const [tasks,setTasks]=useState([]);const [loading,setLoading]=useState(true);
  const load=()=>api.get('/tasks').then(r=>setTasks(r.data)).finally(()=>setLoading(false));
  useEffect(()=>{load();},[]);
  const move=async(task,status)=>{
    try{await api.put(`/tasks/${task.id}`,{...task,status,project_id:task.project_id});setTasks(p=>p.map(t=>t.id===task.id?{...t,status}:t));toast(`→ ${status} ✓`);}
    catch{toast('Error','error');}
  };
  if(loading) return <Page title="Kanban Board"><Spinner/></Page>;
  return <Page title="Kanban Board">
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px'}}>
      {COLS.map(col=>{
        const colTasks=tasks.filter(t=>t.status===col.key);
        return <div key={col.key} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'14px',minHeight:'400px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px',fontSize:'13px',fontWeight:700}}>
            <span style={{width:'8px',height:'8px',borderRadius:'50%',background:col.color,display:'inline-block'}}/>
            {col.label}
            <span style={{background:'var(--surface3)',color:'var(--text2)',fontSize:'11px',padding:'1px 7px',borderRadius:'99px',marginLeft:'auto'}}>{colTasks.length}</span>
          </div>
          {colTasks.map(t=>(
            <div key={t.id} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'8px',padding:'12px',marginBottom:'10px',borderLeft:`3px solid ${col.color}`}}>
              <div style={{fontSize:'13px',fontWeight:600,marginBottom:'6px',lineHeight:1.4}}>{t.title}</div>
              <div style={{marginBottom:'6px'}}><Priority level={t.priority}/></div>
              <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'10px'}}>{t.project_name||'—'} · {t.assignee_name||'Unassigned'}</div>
              <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                {COLS.filter(c=>c.key!==col.key).map(c=>(
                  <button key={c.key} onClick={()=>move(t,c.key)}
                    style={{fontSize:'10px',padding:'3px 8px',borderRadius:'6px',border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text3)',cursor:'pointer'}}>
                    → {c.key}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!colTasks.length&&<div style={{color:'var(--text3)',fontSize:'12px',textAlign:'center',paddingTop:'20px'}}>No tasks</div>}
        </div>;
      })}
    </div>
  </Page>;
}
