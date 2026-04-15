import React,{useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Page,StatCard,Table,Td,Badge,Priority,Progress,DueDate,Spinner} from '../components/common/UI';
import api from '../utils/api';

export default function Dashboard(){
  const [projects,setProjects]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [approvals,setApprovals]=useState([]);
  const [loading,setLoading]=useState(true);
  const navigate=useNavigate();

  useEffect(()=>{
    Promise.all([api.get('/projects'),api.get('/tasks'),api.get('/approvals')])
      .then(([p,t,a])=>{setProjects(p.data);setTasks(t.data);setApprovals(a.data);})
      .finally(()=>setLoading(false));
  },[]);

  if(loading) return <Page title="Dashboard"><Spinner/></Page>;

  const active=projects.filter(p=>p.status!=='done').length;
  const openT=tasks.filter(t=>t.status!=='done').length;
  const overdue=tasks.filter(t=>t.status!=='done'&&new Date(t.due_date)<new Date()).length;
  const pendingA=approvals.filter(a=>a.status==='pending').length;

  return (
    <Page title="Dashboard">
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'24px'}}>
        <StatCard label="📁 Active Projects" value={active} sub={`${projects.length} total`} onClick={()=>navigate('/projects')}/>
        <StatCard label="✅ Open Tasks" value={openT} color="var(--success)" sub={`${tasks.length} total`} onClick={()=>navigate('/tasks')}/>
        <StatCard label="⏰ Overdue" value={overdue} color="var(--danger)" sub="Needs attention" onClick={()=>navigate('/tasks')}/>
        <StatCard label="✔️ Pending Approvals" value={pendingA} color="var(--warning)" onClick={()=>navigate('/approvals')}/>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
        <h2 style={{fontSize:'15px',fontWeight:'700'}}>📁 Active Projects</h2>
        <button onClick={()=>navigate('/projects')} style={{background:'none',border:'1px solid var(--border)',borderRadius:'8px',padding:'5px 12px',color:'var(--text2)',fontSize:'12px',cursor:'pointer'}}>View All →</button>
      </div>
      <Table headers={['Project','Status','Priority','Progress','Team','Due Date']}>
        {projects.filter(p=>p.status!=='done').slice(0,5).map(p=>(
          <tr key={p.id} style={{cursor:'pointer'}} onClick={()=>navigate(`/projects/${p.id}`)}>
            <Td><div style={{fontWeight:600}}>{p.name}</div><div style={{fontSize:'11px',color:'var(--text3)'}}>{p.description}</div></Td>
            <Td><Badge status={p.status}/></Td>
            <Td><Priority level={p.priority}/></Td>
            <Td><Progress value={p.progress||0}/></Td>
            <Td><span style={{fontSize:'12px',color:'var(--text2)'}}>{(p.members||[]).length} members</span></Td>
            <Td><DueDate date={p.end_date}/></Td>
          </tr>
        ))}
      </Table>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
        <h2 style={{fontSize:'15px',fontWeight:'700'}}>✅ Recent Tasks</h2>
        <button onClick={()=>navigate('/tasks')} style={{background:'none',border:'1px solid var(--border)',borderRadius:'8px',padding:'5px 12px',color:'var(--text2)',fontSize:'12px',cursor:'pointer'}}>View All →</button>
      </div>
      <Table headers={['Task','Project','Assignee','Status','Priority','Due']}>
        {tasks.slice(0,6).map(t=>(
          <tr key={t.id}>
            <Td><div style={{fontWeight:600}}>{t.title}</div></Td>
            <Td><span style={{fontSize:'12px',color:'var(--text2)'}}>{t.project_name||'—'}</span></Td>
            <Td>{t.assignee_name||'Unassigned'}</Td>
            <Td><Badge status={t.status}/></Td>
            <Td><Priority level={t.priority}/></Td>
            <Td><DueDate date={t.due_date}/></Td>
          </tr>
        ))}
      </Table>
    </Page>
  );
}
