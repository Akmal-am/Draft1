import React,{useEffect,useRef,useState} from 'react';

// Toast
let _addToast=null;
export function ToastContainer(){
  const [toasts,setToasts]=useState([]);
  _addToast=(msg,type='success')=>{
    const id=Date.now();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200);
  };
  const icons={success:'✅',warning:'⚠️',error:'❌',info:'ℹ️'};
  const colors={success:'var(--success)',warning:'var(--warning)',error:'var(--danger)',info:'var(--info)'};
  return (
    <div style={{position:'fixed',top:'20px',right:'20px',zIndex:9999,display:'flex',flexDirection:'column',gap:'8px'}}>
      {toasts.map(t=>(
        <div key={t.id} style={{background:'var(--surface)',border:`1px solid var(--border)`,borderLeft:`3px solid ${colors[t.type]}`,borderRadius:'10px',padding:'12px 18px',fontSize:'13.5px',boxShadow:'var(--shadow)',display:'flex',alignItems:'center',gap:'10px',minWidth:'260px',animation:'slideIn .25s ease'}}>
          <span>{icons[t.type]}</span>{t.msg}
        </div>
      ))}
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}
export const toast=(msg,type='success')=>_addToast?.(msg,type);

// Modal
export function Modal({title,onClose,children,footer,width='560px'}){
  const ref=useRef();
  useEffect(()=>{ const h=e=>{ if(e.key==='Escape') onClose(); }; document.addEventListener('keydown',h); return ()=>document.removeEventListener('keydown',h); },[onClose]);
  return (
    <div ref={ref} onClick={e=>e.target===ref.current&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'14px',width:'100%',maxWidth:width,maxHeight:'88vh',overflow:'auto',boxShadow:'var(--shadow)'}}>
        <div style={{padding:'20px 24px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'var(--surface)',zIndex:1}}>
          <h2 style={{fontSize:'16px',fontWeight:'700'}}>{title}</h2>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:'20px',lineHeight:1}}>✕</button>
        </div>
        <div style={{padding:'20px 24px'}}>{children}</div>
        {footer&&<div style={{padding:'16px 24px',borderTop:'1px solid var(--border)',display:'flex',gap:'10px',justifyContent:'flex-end',position:'sticky',bottom:0,background:'var(--surface)'}}>{footer}</div>}
      </div>
    </div>
  );
}

// Button
export function Btn({children,onClick,variant='primary',size='md',disabled,type='button',style:{}}){
  const bg={primary:'var(--accent)',ghost:'var(--surface2)',danger:'var(--danger)',success:'var(--success)',warning:'var(--warning)',info:'rgba(6,182,212,.15)'};
  const col={primary:'#fff',ghost:'var(--text2)',danger:'#fff',success:'#fff',warning:'#000',info:'var(--info)'};
  const pad=size==='sm'?'5px 11px':'8px 16px';
  const fs=size==='sm'?'12px':'13.5px';
  return <button type={type} onClick={onClick} disabled={disabled}
    style={{padding:pad,borderRadius:'8px',border:`1px solid ${variant==='ghost'?'var(--border)':'transparent'}`,cursor:disabled?'not-allowed':'pointer',
      fontSize:fs,fontWeight:600,background:bg[variant]||bg.primary,color:col[variant]||col.primary,
      display:'inline-flex',alignItems:'center',gap:'6px',opacity:disabled?.6:1,transition:'all .15s',...(style||{})}}>{children}</button>;
}

// Badge
const BS={active:{bg:'rgba(16,185,129,.15)',c:'var(--success)'},pending:{bg:'rgba(245,158,11,.15)',c:'var(--warning)'},
  review:{bg:'rgba(6,182,212,.15)',c:'var(--info)'},done:{bg:'rgba(100,116,139,.15)',c:'var(--text3)'},
  blocked:{bg:'rgba(239,68,68,.15)',c:'var(--danger)'},approved:{bg:'rgba(79,110,247,.15)',c:'var(--accent)'},rejected:{bg:'rgba(239,68,68,.15)',c:'var(--danger)'}};
const BL={active:'Active',pending:'Pending',review:'In Review',done:'Done',blocked:'Blocked',approved:'Approved',rejected:'Rejected'};
export function Badge({status}){
  const s=BS[status]||{bg:'var(--surface3)',c:'var(--text2)'};
  return <span style={{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:'99px',fontSize:'11px',fontWeight:600,background:s.bg,color:s.c}}>{BL[status]||status}</span>;
}

// Priority
export function Priority({level}){
  const m={high:{i:'🔴',c:'var(--danger)'},med:{i:'🟡',c:'var(--warning)'},low:{i:'🟢',c:'var(--success)'}};
  const s=m[level]||m.med;
  return <span style={{color:s.c,fontSize:'12px'}}>{s.i} {level==='med'?'Medium':level?level.charAt(0).toUpperCase()+level.slice(1):'—'}</span>;
}

// Progress
export function Progress({value}){
  return <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
    <div style={{flex:1,height:'6px',background:'var(--surface3)',borderRadius:'99px',overflow:'hidden',minWidth:'80px'}}>
      <div style={{height:'100%',width:`${value||0}%`,background:'linear-gradient(90deg,var(--accent),var(--accent2))',borderRadius:'99px',transition:'width .4s'}}/>
    </div>
    <span style={{fontSize:'12px',color:'var(--text2)',width:'32px',textAlign:'right'}}>{value||0}%</span>
  </div>;
}

// Avatar
const AVCOLS=['#4f6ef7','#7c3aed','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#f97316'];
export function Avatar({name,size=28,style={}}){
  const ini=name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?';
  const col=AVCOLS[(name?.charCodeAt(0)||0)%AVCOLS.length];
  return <div title={name} style={{width:size,height:size,borderRadius:'50%',background:col,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.38,fontWeight:700,color:'#fff',flexShrink:0,...style}}>{ini}</div>;
}

// FormRow
export function FormRow({label,children}){
  return <div style={{marginBottom:'16px'}}><label style={{display:'block',fontSize:'12px',fontWeight:'600',color:'var(--text2)',marginBottom:'6px'}}>{label}</label>{children}</div>;
}
export const inp={width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--text)',padding:'9px 12px',fontSize:'13.5px',outline:'none'};

// Table
export function Table({headers,children,empty='No data found'}){
  const rows=React.Children.toArray(children).filter(Boolean);
  return <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden',marginBottom:'24px'}}>
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',minWidth:'600px'}}>
        <thead><tr style={{background:'var(--surface2)'}}>
          {headers.map((h,i)=><th key={i} style={{padding:'11px 14px',textAlign:'left',fontSize:'11px',fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.5px',whiteSpace:'nowrap'}}>{h}</th>)}
        </tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
    {rows.length===0&&<div style={{textAlign:'center',padding:'48px',color:'var(--text3)',fontSize:'14px'}}>{empty}</div>}
  </div>;
}
export function Td({children,style={}}){
  return <td style={{padding:'10px 14px',fontSize:'13.5px',borderTop:'1px solid var(--border)',verticalAlign:'middle',...style}}>{children}</td>;
}

// Page wrapper
export function Page({title,action,children,tabs,activeTab,onTabChange}){
  return <div>
    <div style={{padding:'16px 28px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'16px',background:'var(--surface)',position:'sticky',top:0,zIndex:10}}>
      <h1 style={{fontSize:'18px',fontWeight:'700',flex:1}}>{title}</h1>{action}
    </div>
    {tabs&&<div style={{display:'flex',gap:'4px',background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'0 28px'}}>
      {tabs.map((t,i)=><div key={t} onClick={()=>onTabChange(i)} style={{padding:'11px 16px',cursor:'pointer',fontSize:'13.5px',fontWeight:activeTab===i?600:400,color:activeTab===i?'var(--accent)':'var(--text3)',borderBottom:`2px solid ${activeTab===i?'var(--accent)':'transparent'}`,transition:'all .15s'}}>{t}</div>)}
    </div>}
    <div style={{padding:'24px 28px'}}>{children}</div>
    <ToastContainer/>
  </div>;
}

// StatCard
export function StatCard({label,value,color='var(--accent)',sub,onClick}){
  return <div onClick={onClick} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'18px',cursor:onClick?'pointer':'default',transition:'border-color .15s'}} onMouseEnter={e=>onClick&&(e.currentTarget.style.borderColor='var(--accent)')} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
    <div style={{fontSize:'12px',color:'var(--text3)',marginBottom:'6px'}}>{label}</div>
    <div style={{fontSize:'26px',fontWeight:'700',color}}>{value}</div>
    {sub&&<div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>{sub}</div>}
  </div>;
}

// DueDate
export function DueDate({date}){
  if(!date) return <span style={{color:'var(--text3)'}}>—</span>;
  const d=new Date(date),now=new Date();
  const color=d<now?'var(--danger)':(d-now)<7*86400000?'var(--warning)':'var(--text3)';
  return <span style={{fontSize:'12px',color}}>{d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>;
}

// Spinner
export function Spinner(){
  return <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'60px',color:'var(--text3)',fontSize:'14px'}}>Loading...</div>;
}

// Select (filter)
export function FilterSelect({value,onChange,children,placeholder}){
  return <select value={value} onChange={e=>onChange(e.target.value)}
    style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'8px',padding:'6px 10px',color:'var(--text2)',fontSize:'12.5px',cursor:'pointer',outline:'none'}}>
    {placeholder&&<option value="">{placeholder}</option>}
    {children}
  </select>;
}
