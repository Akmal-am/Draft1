import React,{useEffect,useState} from 'react';
import {Page,Badge,Spinner,Btn,Modal,FormRow,inp,toast,FilterSelect} from '../components/common/UI';
import {useAuth} from '../context/AuthContext';
import api from '../utils/api';
export default function ApprovalsPage(){
  const {isManager}=useAuth();
  const [approvals,setApprovals]=useState([]);const [projects,setProjects]=useState([]);const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);const [filter,setFilter]=useState('pending');
  const [form,setForm]=useState({title:'',type:'Timeline',project_id:'',note:''});const [saving,setSaving]=useState(false);
  const load=()=>Promise.all([api.get('/approvals'),api.get('/projects')]).then(([a,p])=>{setApprovals(a.data);setProjects(p.data);if(p.data.length)setForm(f=>({...f,project_id:String(p.data[0].id)}));}).finally(()=>setLoading(false));
  useEffect(()=>{load();},[]);
  const submit=async()=>{
    if(!form.title.trim()){toast('Title required','error');return;}
    setSaving(true);try{await api.post('/approvals',form);toast('Request submitted ✓');setModal(false);load();}
    catch(err){toast(err.response?.data?.error||'Error','error');}finally{setSaving(false);}
  };
  const review=async(id,status)=>{try{await api.put(`/approvals/${id}/review`,{status});toast(status==='approved'?'Approved ✓':'Rejected','warning');load();}catch{toast('Error','error');}};
  const ICONS={Timeline:'📅',Contract:'📄',Resource:'👥',Other:'📌'};
  const filtered=filter?approvals.filter(a=>a.status===filter):approvals;
  if(loading) return <Page title="Approvals"><Spinner/></Page>;
  return <Page title="Approvals" action={<Btn onClick={()=>setModal(true)}>+ New Request</Btn>}>
    <div style={{display:'flex',gap:'10px',marginBottom:'16px'}}>
      {['pending','approved','rejected',''].map(s=>(
        <button key={s} onClick={()=>setFilter(s)} style={{padding:'6px 14px',borderRadius:'99px',fontSize:'12px',cursor:'pointer',border:'1px solid var(--border)',background:filter===s?'var(--accent)':'var(--surface2)',color:filter===s?'#fff':'var(--text2)'}}>
          {s?s.charAt(0).toUpperCase()+s.slice(1):'All'}
        </button>
      ))}
      <span style={{marginLeft:'auto',fontSize:'12px',color:'var(--text3)'}}>{filtered.length} requests</span>
    </div>
    {filtered.length===0&&<div style={{textAlign:'center',padding:'60px',color:'var(--text3)'}}><div style={{fontSize:'48px',marginBottom:'12px'}}>🎉</div><div>No approvals in this category</div></div>}
    {filtered.map(a=>(
      <div key={a.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'18px',marginBottom:'12px',display:'flex',alignItems:'center',gap:'16px'}}>
        <div style={{fontSize:'28px'}}>{ICONS[a.type]||'📌'}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:'14px',marginBottom:'4px'}}>{a.title}</div>
          <div style={{fontSize:'12px',color:'var(--text3)',marginBottom:'4px'}}>{a.type} · {a.project_name||'—'} · By <strong>{a.requested_by_name||'—'}</strong>{a.reviewed_by_name&&` · Reviewed by ${a.reviewed_by_name}`}</div>
          {a.note&&<div style={{fontSize:'12.5px',color:'var(--text2)'}}>{a.note}</div>}
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'8px'}}>
          <Badge status={a.status}/>
          {a.status==='pending'&&isManager&&<div style={{display:'flex',gap:'8px'}}>
            <Btn variant="success" size="sm" onClick={()=>review(a.id,'approved')}>✓ Approve</Btn>
            <Btn variant="danger" size="sm" onClick={()=>review(a.id,'rejected')}>✕ Reject</Btn>
          </div>}
        </div>
      </div>
    ))}
    {modal&&<Modal title="New Approval Request" onClose={()=>setModal(false)}
      footer={<><Btn variant="ghost" onClick={()=>setModal(false)}>Cancel</Btn><Btn onClick={submit} disabled={saving}>{saving?'Submitting...':'Submit'}</Btn></>}>
      <FormRow label="Title"><input style={inp} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="What needs approval?"/></FormRow>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
        <FormRow label="Type"><select style={inp} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{['Timeline','Contract','Resource','Other'].map(t=><option key={t}>{t}</option>)}</select></FormRow>
        <FormRow label="Project"><select style={inp} value={form.project_id} onChange={e=>setForm(f=>({...f,project_id:e.target.value}))}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FormRow>
      </div>
      <FormRow label="Notes"><textarea style={{...inp,resize:'vertical',minHeight:'72px'}} value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Explain the request..."/></FormRow>
    </Modal>}
  </Page>;
}
