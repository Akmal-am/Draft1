import React,{useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Page,Table,Td,Badge,Priority,Progress,DueDate,Spinner,Btn,Modal,FormRow,inp,toast,FilterSelect} from '../components/common/UI';
import {useAuth} from '../context/AuthContext';
import api from '../utils/api';

function ProjectModal({project,users,onSave,onClose}){
  const {user}=useAuth();
  const [form,setForm]=useState({
    name:project?.name||'',description:project?.description||'',
    status:project?.status||'active',priority:project?.priority||'med',
    progress:project?.progress||0,start_date:project?.start_date?.split('T')[0]||'',
    end_date:project?.end_date?.split('T')[0]||'',manager_id:project?.manager_id||user.id,
    member_ids:project?.members?.map(m=>m.id)||[],
  });
  const [saving,setSaving]=useState(false);
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const toggleMember=id=>setForm(p=>({...p,member_ids:p.member_ids.includes(id)?p.member_ids.filter(x=>x!==id):[...p.member_ids,id]}));

  const save=async()=>{
    if(!form.name.trim()){toast('Name required','error');return;}
    setSaving(true);
    try{
      if(project) await api.put(`/projects/${project.id}`,form);
      else await api.post('/projects',form);
      toast(project?'Project updated ✓':'Project created ✓');onSave();
    }catch(err){toast(err.response?.data?.error||'Error','error');}
    finally{setSaving(false);}
  };

  return (
    <Modal title={project?'Edit Project':'New Project'} onClose={onClose} width="600px"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving?'Saving...':'Save Project'}</Btn></>}>
      <FormRow label="Project Name"><input style={inp} value={form.name} onChange={f('name')} placeholder="e.g. OE45-WMOE-49"/></FormRow>
      <FormRow label="Description"><textarea style={{...inp,minHeight:'68px',resize:'vertical'}} value={form.description} onChange={f('description')}/></FormRow>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
        <FormRow label="Status"><select style={inp} value={form.status} onChange={f('status')}>
          {['pending','active','review','done','blocked'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select></FormRow>
        <FormRow label="Priority"><select style={inp} value={form.priority} onChange={f('priority')}>
          <option value="low">Low</option><option value="med">Medium</option><option value="high">High</option>
        </select></FormRow>
        <FormRow label="Start Date"><input type="date" style={inp} value={form.start_date} onChange={f('start_date')}/></FormRow>
        <FormRow label="End Date"><input type="date" style={inp} value={form.end_date} onChange={f('end_date')}/></FormRow>
      </div>
      <FormRow label={`Progress: ${form.progress}%`}>
        <input type="range" min={0} max={100} value={form.progress} onChange={f('progress')} style={{width:'100%',accentColor:'var(--accent)'}}/>
      </FormRow>
      <FormRow label="Project Manager">
        <select style={inp} value={form.manager_id} onChange={f('manager_id')}>
          {users.filter(u=>['admin','manager'].includes(u.role)).map(u=><option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
        </select>
      </FormRow>
      <FormRow label="Assign Team Members (click to toggle)">
        <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginTop:'4px'}}>
          {users.map(u=>{
            const sel=form.member_ids.includes(u.id);
            return <div key={u.id} onClick={()=>toggleMember(u.id)}
              style={{padding:'5px 12px',borderRadius:'99px',fontSize:'12px',cursor:'pointer',userSelect:'none',
                background:sel?'rgba(79,110,247,.2)':'var(--surface3)',
                border:`1px solid ${sel?'var(--accent)':'var(--border)'}`,
                color:sel?'var(--accent)':'var(--text2)',transition:'all .15s'}}>
              {sel?'✓ ':''}{u.name} <span style={{opacity:.6,fontSize:'10px'}}>({u.role})</span>
            </div>;
          })}
        </div>
      </FormRow>
    </Modal>
  );
}

export default function ProjectsPage(){
  const {isManager}=useAuth();
  const navigate=useNavigate();
  const [projects,setProjects]=useState([]);
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(null);
  const [statusF,setStatusF]=useState('');

  const load=()=>Promise.all([api.get('/projects'),api.get('/users').catch(()=>({data:[]}))]).then(([p,u])=>{setProjects(p.data);setUsers(u.data);}).finally(()=>setLoading(false));
  useEffect(()=>{load();},[]);

  const del=async id=>{
    if(!window.confirm('Delete project and all tasks?'))return;
    try{await api.delete(`/projects/${id}`);toast('Project deleted','warning');load();}
    catch(err){toast(err.response?.data?.error||'Error','error');}
  };

  const filtered=statusF?projects.filter(p=>p.status===statusF):projects;
  if(loading) return <Page title="Projects"><Spinner/></Page>;

  return (
    <Page title="All Projects" action={isManager&&<Btn onClick={()=>setModal('new')}>+ New Project</Btn>}>
      <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap',alignItems:'center'}}>
        {['','active','pending','review','done','blocked'].map(s=>(
          <button key={s} onClick={()=>setStatusF(s)}
            style={{padding:'6px 14px',borderRadius:'99px',fontSize:'12px',cursor:'pointer',border:'1px solid var(--border)',
              background:statusF===s?'var(--accent)':'var(--surface2)',color:statusF===s?'#fff':'var(--text2)',transition:'all .15s'}}>
            {s?s.charAt(0).toUpperCase()+s.slice(1):'All'}
          </button>
        ))}
        <span style={{marginLeft:'auto',fontSize:'12px',color:'var(--text3)'}}>{filtered.length} projects</span>
      </div>
      <Table headers={['Project','Status','Priority','Progress','Team','End Date','Actions']}>
        {filtered.map(p=>(
          <tr key={p.id} style={{cursor:'pointer'}} onClick={()=>navigate(`/projects/${p.id}`)}>
            <Td><div style={{fontWeight:600}}>{p.name}</div><div style={{fontSize:'11px',color:'var(--text3)'}}>{p.description}</div></Td>
            <Td><Badge status={p.status}/></Td>
            <Td><Priority level={p.priority}/></Td>
            <Td><Progress value={p.progress||0}/></Td>
            <Td><span style={{fontSize:'12px',color:'var(--text2)'}}>{(p.members||[]).length} members</span></Td>
            <Td><DueDate date={p.end_date}/></Td>
            <Td>{isManager&&<div style={{display:'flex',gap:'6px'}} onClick={e=>e.stopPropagation()}>
              <Btn variant="ghost" size="sm" onClick={()=>setModal(p)}>✏️</Btn>
              <Btn variant="danger" size="sm" onClick={()=>del(p.id)}>🗑️</Btn>
            </div>}</Td>
          </tr>
        ))}
      </Table>
      {modal&&<ProjectModal project={modal==='new'?null:modal} users={users} onSave={()=>{setModal(null);load();}} onClose={()=>setModal(null)}/>}
    </Page>
  );
}
