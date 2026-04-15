import React,{useEffect,useState} from 'react';
import {Page,Table,Td,Badge,Spinner,Btn,Modal,FormRow,inp,Avatar,toast} from '../components/common/UI';
import api from '../utils/api';

function UserModal({user,onSave,onClose}){
  const [form,setForm]=useState({name:user?.name||'',email:user?.email||'',role:user?.role||'member',department:user?.department||'',password:'',is_active:user?.is_active!==false});
  const [saving,setSaving]=useState(false);
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const save=async()=>{
    if(!form.name.trim()||!form.email.trim()){toast('Name and email required','error');return;}
    if(!user&&!form.password){toast('Password required for new user','error');return;}
    if(form.password&&form.password.length<6){toast('Password min 6 chars','error');return;}
    setSaving(true);
    try{if(user)await api.put(`/users/${user.id}`,form);else await api.post('/users',form);toast(user?'Updated ✓':'User created ✓');onSave();}
    catch(err){toast(err.response?.data?.error||'Error','error');}finally{setSaving(false);}
  };
  return <Modal title={user?'Edit User':'Add New User'} onClose={onClose}
    footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving?'Saving...':'Save User'}</Btn></>}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
      <FormRow label="Full Name"><input style={inp} value={form.name} onChange={f('name')} placeholder="Full name"/></FormRow>
      <FormRow label="Email"><input type="email" style={inp} value={form.email} onChange={f('email')} placeholder="email@company.com"/></FormRow>
      <FormRow label="Role"><select style={inp} value={form.role} onChange={f('role')}><option value="member">Member</option><option value="manager">Manager</option><option value="admin">Admin</option></select></FormRow>
      <FormRow label="Department"><input style={inp} value={form.department} onChange={f('department')} placeholder="e.g. Spooling, QA"/></FormRow>
      <FormRow label={user?'New Password (blank = keep)':'Password'}>
        <input type="password" style={inp} value={form.password} onChange={f('password')} placeholder={user?'Leave blank to keep':'Min 6 chars'}/>
      </FormRow>
      {user&&<FormRow label="Account Status"><select style={inp} value={String(form.is_active)} onChange={e=>setForm(p=>({...p,is_active:e.target.value==='true'}))}><option value="true">Active</option><option value="false">Inactive</option></select></FormRow>}
    </div>
  </Modal>;
}

export default function AdminPage(){
  const [users,setUsers]=useState([]);const [loading,setLoading]=useState(true);const [modal,setModal]=useState(null);
  const load=()=>api.get('/users').then(r=>setUsers(r.data)).finally(()=>setLoading(false));
  useEffect(()=>{load();},[]);
  const del=async id=>{
    if(!window.confirm('Deactivate this user? They will lose access.'))return;
    try{await api.delete(`/users/${id}`);toast('User deactivated','warning');load();}
    catch(err){toast(err.response?.data?.error||'Error','error');}
  };
  const RC={admin:'var(--danger)',manager:'var(--accent)',member:'var(--text3)'};
  if(loading) return <Page title="Admin — User Management"><Spinner/></Page>;
  return <Page title="⚙️ User Management" action={<Btn onClick={()=>setModal('new')}>+ Add User</Btn>}>
    <div style={{background:'rgba(79,110,247,.07)',border:'1px solid rgba(79,110,247,.2)',borderRadius:'10px',padding:'14px 18px',marginBottom:'24px',fontSize:'13.5px',color:'var(--text2)'}}>
      <strong style={{color:'var(--accent)'}}>Admin Only</strong> — Only admins can create, edit, or deactivate users. Use this panel to manage who has access.
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginBottom:'24px'}}>
      {[{l:'Total Users',v:users.length,c:'var(--accent)'},{l:'Active',v:users.filter(u=>u.is_active).length,c:'var(--success)'},{l:'Managers & Admins',v:users.filter(u=>u.role!=='member').length,c:'var(--warning)'}].map(s=>(
        <div key={s.l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'18px'}}>
          <div style={{fontSize:'12px',color:'var(--text3)',marginBottom:'6px'}}>{s.l}</div>
          <div style={{fontSize:'26px',fontWeight:'700',color:s.c}}>{s.v}</div>
        </div>
      ))}
    </div>
    <Table headers={['User','Email','Role','Department','Status','Joined','Actions']}>
      {users.map(u=>(
        <tr key={u.id}>
          <Td><div style={{display:'flex',alignItems:'center',gap:'10px'}}><Avatar name={u.name} size={32}/><div style={{fontWeight:600}}>{u.name}</div></div></Td>
          <Td><span style={{fontSize:'12.5px',color:'var(--text2)'}}>{u.email}</span></Td>
          <Td><span style={{fontSize:'12px',fontWeight:600,color:RC[u.role]||'var(--text2)',textTransform:'capitalize'}}>{u.role}</span></Td>
          <Td><span style={{fontSize:'12px',color:'var(--text3)'}}>{u.department||'—'}</span></Td>
          <Td><Badge status={u.is_active?'active':'blocked'}/></Td>
          <Td><span style={{fontSize:'11px',color:'var(--text3)'}}>{new Date(u.created_at).toLocaleDateString('en-IN')}</span></Td>
          <Td><div style={{display:'flex',gap:'6px'}}>
            <Btn variant="ghost" size="sm" onClick={()=>setModal(u)}>✏️</Btn>
            <Btn variant="danger" size="sm" onClick={()=>del(u.id)}>🗑️</Btn>
          </div></Td>
        </tr>
      ))}
    </Table>

    {/* Access Control Summary */}
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'20px',marginTop:'8px'}}>
      <h3 style={{fontSize:'14px',fontWeight:700,marginBottom:'14px'}}>🔐 Role Permissions Summary</h3>
      {[
        {role:'Admin',color:'var(--danger)',perms:['Full access to everything','Add/edit/delete users','Upload & download Excel files','Set column edit permissions per user','Export project data','Approve/reject requests']},
        {role:'Manager',color:'var(--accent)',perms:['Create/edit projects & assign users','Upload & download Excel','Set column permissions','Export data','Approve/reject requests','View all team data']},
        {role:'Member',color:'var(--text3)',perms:['View assigned projects only','Update own tasks','View Excel data (read-only by default)','Edit only permitted columns (set by admin)','Cannot upload/download Excel','Submit approval requests']},
      ].map(r=>(
        <div key={r.role} style={{marginBottom:'16px'}}>
          <div style={{fontWeight:600,color:r.color,fontSize:'13px',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.5px'}}>{r.role}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
            {r.perms.map(p=><span key={p} style={{fontSize:'11.5px',padding:'3px 10px',borderRadius:'99px',background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text2)'}}>{p}</span>)}
          </div>
        </div>
      ))}
    </div>

    {modal&&<UserModal user={modal==='new'?null:modal} onSave={()=>{setModal(null);load();}} onClose={()=>setModal(null)}/>}
  </Page>;
}
