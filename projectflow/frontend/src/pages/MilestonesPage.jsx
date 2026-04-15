import React,{useEffect,useState} from 'react';
import {Page,Table,Td,Badge,DueDate,Spinner,Btn,Modal,FormRow,inp,toast} from '../components/common/UI';
import {useAuth} from '../context/AuthContext';
import api from '../utils/api';
export default function MilestonesPage(){
  const {isManager}=useAuth();
  const [milestones,setMilestones]=useState([]);const [projects,setProjects]=useState([]);const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(null);const [form,setForm]=useState({title:'',description:'',project_id:'',due_date:'',status:'pending'});const [saving,setSaving]=useState(false);
  const load=()=>Promise.all([api.get('/milestones'),api.get('/projects')]).then(([m,p])=>{setMilestones(m.data);setProjects(p.data);if(p.data.length)setForm(f=>({...f,project_id:String(p.data[0].id)}));}).finally(()=>setLoading(false));
  useEffect(()=>{load();},[]);
  const openEdit=m=>{setForm({title:m.title,description:m.description||'',project_id:String(m.project_id),due_date:m.due_date?.split('T')[0]||'',status:m.status});setModal(m);};
  const save=async()=>{
    if(!form.title.trim()){toast('Title required','error');return;}
    setSaving(true);try{if(modal==='new')await api.post('/milestones',form);else await api.put(`/milestones/${modal.id}`,form);toast(modal==='new'?'Created ✓':'Updated ✓');setModal(null);load();}
    catch(err){toast(err.response?.data?.error||'Error','error');}finally{setSaving(false);}
  };
  const del=async id=>{if(!window.confirm('Delete?'))return;try{await api.delete(`/milestones/${id}`);toast('Deleted','warning');load();}catch{toast('Error','error');}};
  if(loading) return <Page title="Milestones"><Spinner/></Page>;
  return <Page title="Milestones" action={isManager&&<Btn onClick={()=>{setForm({title:'',description:'',project_id:String(projects[0]?.id||''),due_date:'',status:'pending'});setModal('new');}}>+ Milestone</Btn>}>
    <Table headers={['Milestone','Project','Due Date','Status','Notes','Actions']}>
      {milestones.map(m=>(
        <tr key={m.id}>
          <Td style={{fontWeight:600}}>{m.title}</Td>
          <Td><span style={{fontSize:'12px',color:'var(--text2)'}}>{m.project_name||'—'}</span></Td>
          <Td><DueDate date={m.due_date}/></Td>
          <Td><Badge status={m.status}/></Td>
          <Td style={{color:'var(--text3)',fontSize:'12px'}}>{m.description||'—'}</Td>
          <Td>{isManager&&<div style={{display:'flex',gap:'6px'}}><Btn variant="ghost" size="sm" onClick={()=>openEdit(m)}>✏️</Btn><Btn variant="danger" size="sm" onClick={()=>del(m.id)}>🗑️</Btn></div>}</Td>
        </tr>
      ))}
    </Table>
    {modal&&<Modal title={modal==='new'?'New Milestone':'Edit Milestone'} onClose={()=>setModal(null)}
      footer={<><Btn variant="ghost" onClick={()=>setModal(null)}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving?'Saving...':'Save'}</Btn></>}>
      <FormRow label="Title"><input style={inp} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Milestone name"/></FormRow>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
        <FormRow label="Project"><select style={inp} value={form.project_id} onChange={e=>setForm(f=>({...f,project_id:e.target.value}))}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FormRow>
        <FormRow label="Due Date"><input type="date" style={inp} value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))}/></FormRow>
        <FormRow label="Status"><select style={inp} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{['pending','active','review','done'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></FormRow>
      </div>
      <FormRow label="Description"><textarea style={{...inp,resize:'vertical',minHeight:'60px'}} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></FormRow>
    </Modal>}
  </Page>;
}
