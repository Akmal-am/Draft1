import React,{useEffect,useState} from 'react';
import {Page,Table,Td,Badge,Priority,DueDate,Spinner,Btn,Modal,FormRow,inp,toast,FilterSelect} from '../components/common/UI';
import {useAuth} from '../context/AuthContext';
import api from '../utils/api';

function TaskModal({task,projects,users,onSave,onClose}){
  const {user}=useAuth();
  const [form,setForm]=useState({title:task?.title||'',description:task?.description||'',
    project_id:task?.project_id||projects[0]?.id||'',assignee_id:task?.assignee_id||user.id,
    status:task?.status||'pending',priority:task?.priority||'med',due_date:task?.due_date?.split('T')[0]||''});
  const [saving,setSaving]=useState(false);
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const save=async()=>{
    if(!form.title.trim()){toast('Title required','error');return;}
    setSaving(true);
    try{if(task)await api.put(`/tasks/${task.id}`,form);else await api.post('/tasks',form);
      toast(task?'Updated ✓':'Created ✓');onSave();}
    catch(err){toast(err.response?.data?.error||'Error','error');}
    finally{setSaving(false);}
  };
  return <Modal title={task?'Edit Task':'New Task'} onClose={onClose}
    footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving?'Saving...':'Save'}</Btn></>}>
    <FormRow label="Title"><input style={inp} value={form.title} onChange={f('title')} placeholder="Task title"/></FormRow>
    <FormRow label="Description"><textarea style={{...inp,minHeight:'60px',resize:'vertical'}} value={form.description} onChange={f('description')}/></FormRow>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
      <FormRow label="Project"><select style={inp} value={form.project_id} onChange={f('project_id')}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FormRow>
      <FormRow label="Assignee"><select style={inp} value={form.assignee_id} onChange={f('assignee_id')}>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></FormRow>
      <FormRow label="Status"><select style={inp} value={form.status} onChange={f('status')}>{['pending','active','review','done','blocked'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></FormRow>
      <FormRow label="Priority"><select style={inp} value={form.priority} onChange={f('priority')}><option value="low">Low</option><option value="med">Medium</option><option value="high">High</option></select></FormRow>
    </div>
    <FormRow label="Due Date"><input type="date" style={inp} value={form.due_date} onChange={f('due_date')}/></FormRow>
  </Modal>;
}

export default function TasksPage(){
  const {user,isManager}=useAuth();
  const [tasks,setTasks]=useState([]);const [projects,setProjects]=useState([]);const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);const [modal,setModal]=useState(null);
  const [filters,setFilters]=useState({status:'',project:'',assignee:''});const [myOnly,setMyOnly]=useState(false);

  const load=()=>Promise.all([api.get('/tasks'),api.get('/projects'),api.get('/users').catch(()=>({data:[]}))]).then(([t,p,u])=>{setTasks(t.data);setProjects(p.data);setUsers(u.data);}).finally(()=>setLoading(false));
  useEffect(()=>{load();},[]);

  const del=async id=>{if(!window.confirm('Delete?'))return;try{await api.delete(`/tasks/${id}`);toast('Deleted','warning');load();}catch{toast('Error','error');}};
  const cycle=async t=>{const c=['pending','active','review','done'];const n=c[(c.indexOf(t.status)+1)%c.length];
    try{await api.put(`/tasks/${t.id}`,{...t,status:n,project_id:t.project_id});toast(`→ ${n} ✓`);load();}catch{toast('Error','error');}};

  let list=tasks;
  if(myOnly)list=list.filter(t=>t.assignee_id===user.id);
  if(filters.status)list=list.filter(t=>t.status===filters.status);
  if(filters.project)list=list.filter(t=>t.project_id==filters.project);
  if(filters.assignee)list=list.filter(t=>t.assignee_id==filters.assignee);

  if(loading) return <Page title="Tasks"><Spinner/></Page>;
  return (
    <Page title="Tasks" action={<Btn onClick={()=>setModal('new')}>+ New Task</Btn>}>
      <div style={{display:'flex',gap:'10px',marginBottom:'16px',flexWrap:'wrap',alignItems:'center'}}>
        <FilterSelect value={filters.status} onChange={v=>setFilters(f=>({...f,status:v}))} placeholder="All Status">
          {['pending','active','review','done','blocked'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </FilterSelect>
        <FilterSelect value={filters.project} onChange={v=>setFilters(f=>({...f,project:v}))} placeholder="All Projects">
          {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </FilterSelect>
        {isManager&&<FilterSelect value={filters.assignee} onChange={v=>setFilters(f=>({...f,assignee:v}))} placeholder="All Assignees">
          {users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </FilterSelect>}
        <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',color:'var(--text2)',cursor:'pointer'}}>
          <input type="checkbox" checked={myOnly} onChange={e=>setMyOnly(e.target.checked)} style={{accentColor:'var(--accent)'}}/> My Tasks
        </label>
        <span style={{marginLeft:'auto',fontSize:'12px',color:'var(--text3)'}}>{list.length} tasks</span>
      </div>
      <Table headers={['Task','Project','Assignee','Status','Priority','Due','Actions']}>
        {list.map(t=>(
          <tr key={t.id}>
            <Td><div style={{fontWeight:600}}>{t.title}</div><div style={{fontSize:'11px',color:'var(--text3)'}}>{t.description}</div></Td>
            <Td><span style={{fontSize:'12px',color:'var(--text2)'}}>{t.project_name||'—'}</span></Td>
            <Td>{t.assignee_name||'Unassigned'}</Td>
            <Td><Badge status={t.status}/></Td>
            <Td><Priority level={t.priority}/></Td>
            <Td><DueDate date={t.due_date}/></Td>
            <Td><div style={{display:'flex',gap:'5px'}}>
              <Btn variant="ghost" size="sm" onClick={()=>cycle(t)} title="Next status">▶</Btn>
              <Btn variant="ghost" size="sm" onClick={()=>setModal(t)}>✏️</Btn>
              {isManager&&<Btn variant="danger" size="sm" onClick={()=>del(t.id)}>🗑️</Btn>}
            </div></Td>
          </tr>
        ))}
      </Table>
      {modal&&<TaskModal task={modal==='new'?null:modal} projects={projects} users={users} onSave={()=>{setModal(null);load();}} onClose={()=>setModal(null)}/>}
    </Page>
  );
}
