import React,{useEffect,useState,useCallback} from 'react';
import {useParams,useNavigate} from 'react-router-dom';
import {Page,Badge,Priority,Progress,DueDate,Spinner,Btn,Table,Td,Avatar,Modal,FormRow,inp,toast} from '../components/common/UI';
import {useAuth} from '../context/AuthContext';
import api from '../utils/api';

// Known columns from the MERAM Excel structure
const KNOWN_COLUMNS=[
  'SUBCONTRACTOR','MOC/AOC','Priority','Fluid Code','Train','Diam.','Unit Number',
  'Route Type','Eng. Rev','OE Date','PDS Model','Iso+Eng. status','Weldmap Rev',
  'Spooler Name','On Hold','WM Status','Supervisor Name','Drawing Amended (Yes/No)',
  'WMOE No','Eng. Case created by','Open Date','Closed Date','Remap due to SPOOLGEN',
  'remap due to QC','MIR ISO','Duplicate train Remark','Fab Hold_02042025','IsoIndex',
];

// Column Permissions Manager
function ColumnPermissionsModal({projectId,members,onClose}){
  const [cols,setCols]=useState([]);
  const [perms,setPerms]=useState({});// {userId_colName: true/false}
  const [customCol,setCustomCol]=useState('');
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api.get(`/projects/${projectId}/column-permissions`).then(r=>{
      const p={};
      r.data.forEach(row=>{
        p[`${row.user_id}_${row.column_name}`]=row.can_edit;
      });
      setPerms(p);
      // Build col list from existing + known
      const existCols=[...new Set(r.data.map(x=>x.column_name))];
      setCols([...new Set([...KNOWN_COLUMNS,...existCols])]);
    }).finally(()=>setLoading(false));
  },[projectId]);

  const toggle=(userId,col)=>{
    const key=`${userId}_${col}`;
    setPerms(p=>({...p,[key]:!p[key]}));
  };

  const save=async()=>{
    setSaving(true);
    try{
      const permissions=[];
      members.forEach(m=>{
        cols.forEach(col=>{
          const key=`${m.id}_${col}`;
          if(perms[key]){
            permissions.push({user_id:m.id,column_name:col,can_edit:true});
          }
        });
      });
      await api.post(`/projects/${projectId}/column-permissions/bulk`,{permissions});
      toast('Column permissions saved ✓');onClose();
    }catch(err){toast(err.response?.data?.error||'Error','error');}
    finally{setSaving(false);}
  };

  const addCustomCol=()=>{
    if(!customCol.trim())return;
    if(!cols.includes(customCol.trim())){setCols(c=>[...c,customCol.trim()]);}
    setCustomCol('');
  };

  const memberList=members||[];

  return (
    <Modal title="🔐 Column Edit Permissions" onClose={onClose} width="900px"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving?'Saving...':'Save Permissions'}</Btn></>}>
      {loading?<Spinner/>:<>
        <div style={{background:'rgba(79,110,247,.08)',border:'1px solid rgba(79,110,247,.2)',borderRadius:'8px',padding:'12px 16px',marginBottom:'16px',fontSize:'13px',color:'var(--text2)'}}>
          <strong style={{color:'var(--accent)'}}>Instructions:</strong> Check the boxes to allow each user to edit specific columns in the Excel viewer. Unchecked = view only. Admins & Managers always have full access.
        </div>

        <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
          <input style={{...inp,flex:1}} value={customCol} onChange={e=>setCustomCol(e.target.value)} placeholder="Add custom column name..." onKeyDown={e=>e.key==='Enter'&&addCustomCol()}/>
          <Btn variant="ghost" onClick={addCustomCol}>+ Add</Btn>
        </div>

        <div style={{overflowX:'auto',maxHeight:'60vh',overflowY:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12.5px'}}>
            <thead style={{position:'sticky',top:0,zIndex:1}}>
              <tr style={{background:'var(--surface2)'}}>
                <th style={{padding:'10px 12px',textAlign:'left',fontWeight:600,color:'var(--text3)',fontSize:'11px',textTransform:'uppercase',minWidth:'200px',borderBottom:'1px solid var(--border)'}}>Column Name</th>
                {memberList.map(m=>(
                  <th key={m.id} style={{padding:'10px 12px',textAlign:'center',fontWeight:600,color:'var(--text3)',fontSize:'11px',borderBottom:'1px solid var(--border)',minWidth:'100px'}}>
                    <Avatar name={m.name} size={22} style={{margin:'0 auto 4px'}}/>
                    <div style={{color:'var(--text2)',fontSize:'10px',fontWeight:600}}>{m.name.split(' ')[0]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cols.map((col,ci)=>(
                <tr key={col} style={{background:ci%2===0?'transparent':'rgba(255,255,255,.01)'}}>
                  <td style={{padding:'8px 12px',borderTop:'1px solid var(--border)',fontWeight:500,color:'var(--text)',fontSize:'12.5px'}}>{col}</td>
                  {memberList.map(m=>{
                    const key=`${m.id}_${col}`;
                    const checked=!!perms[key];
                    return (
                      <td key={m.id} style={{padding:'8px 12px',borderTop:'1px solid var(--border)',textAlign:'center'}}>
                        <input type="checkbox" checked={checked} onChange={()=>toggle(m.id,col)}
                          style={{width:'16px',height:'16px',cursor:'pointer',accentColor:'var(--accent)'}}/>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{marginTop:'14px',padding:'10px 14px',background:'var(--surface2)',borderRadius:'8px',fontSize:'12px',color:'var(--text3)'}}>
          {memberList.length===0?'No members assigned to this project yet. Add members first.':
          `${memberList.length} members × ${cols.length} columns = ${memberList.length*cols.length} permission slots`}
        </div>
      </>}
    </Modal>
  );
}

// Excel Viewer with editable cells
function ExcelViewer({projectId,isManager}){
  const {user}=useAuth();
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [activeSheet,setActiveSheet]=useState(null);
  const [editCell,setEditCell]=useState(null);// {rowIdx,col,oldVal}
  const [editVal,setEditVal]=useState('');
  const [saving,setSaving]=useState(false);
  const [edits,setEdits]=useState([]);
  const [searchQ,setSearchQ]=useState('');

  const load=useCallback(()=>{
    setLoading(true);
    Promise.all([
      api.get(`/projects/${projectId}/excel-data`),
      api.get(`/projects/${projectId}/excel-edits`),
    ]).then(([d,e])=>{
      setData(d.data);
      setActiveSheet(d.data.sheetNames[0]);
      setEdits(e.data);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[projectId]);

  useEffect(()=>{load();},[load]);

  const editableColumns=data?.editableColumns==='ALL'?null:data?.editableColumns||[];

  const canEditCol=col=>isManager||(editableColumns&&editableColumns.includes(col));

  const startEdit=(rowIdx,col,val)=>{
    if(!canEditCol(col)){toast(`You don't have permission to edit "${col}"`, 'warning');return;}
    setEditCell({rowIdx,col});setEditVal(String(val??''));
  };

  const saveEdit=async()=>{
    if(!editCell)return;
    setSaving(true);
    try{
      await api.post(`/projects/${projectId}/excel-cell`,{
        sheet_name:activeSheet,row_index:editCell.rowIdx,
        column_name:editCell.col,new_value:editVal
      });
      toast(`Saved "${editCell.col}" ✓`);
      setEditCell(null);
      load();
    }catch(err){toast(err.response?.data?.error||'Error saving','error');}
    finally{setSaving(false);}
  };

  if(loading) return <Spinner/>;
  if(!data) return <div style={{textAlign:'center',padding:'60px',color:'var(--text3)'}}><div style={{fontSize:'48px',marginBottom:'12px'}}>📊</div><div>No Excel file uploaded yet.</div>{isManager&&<div style={{marginTop:'8px',fontSize:'13px'}}>Use the "Upload Excel" button above.</div>}</div>;

  const rows=data.sheets[activeSheet]||[];
  const cols=rows.length>0?Object.keys(rows[0]):[];

  // Apply search filter
  const filtered=searchQ?rows.filter(row=>Object.values(row).some(v=>String(v).toLowerCase().includes(searchQ.toLowerCase()))):rows;

  // Get edit overlay for a cell
  const getEditOverlay=(rowIdx,col)=>edits.find(e=>e.row_index===rowIdx&&e.column_name===col&&e.sheet_name===activeSheet);

  return (
    <div>
      {/* Sheet tabs */}
      <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap',alignItems:'center'}}>
        {data.sheetNames.map(s=>(
          <button key={s} onClick={()=>setActiveSheet(s)}
            style={{padding:'6px 14px',borderRadius:'8px',fontSize:'12px',cursor:'pointer',border:'1px solid var(--border)',
              background:activeSheet===s?'var(--accent)':'var(--surface2)',color:activeSheet===s?'#fff':'var(--text2)'}}>
            📋 {s}
          </button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',gap:'8px',alignItems:'center'}}>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search rows..."
            style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'8px',padding:'6px 10px',color:'var(--text)',fontSize:'12.5px',outline:'none',width:'180px'}}/>
          <span style={{fontSize:'12px',color:'var(--text3)'}}>{filtered.length}/{rows.length} rows</span>
        </div>
      </div>

      {/* Permission legend */}
      {!isManager&&<div style={{display:'flex',gap:'16px',marginBottom:'12px',fontSize:'12px',color:'var(--text3)',flexWrap:'wrap'}}>
        <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'12px',height:'12px',background:'rgba(79,110,247,.15)',border:'1px solid var(--accent)',borderRadius:'3px',display:'inline-block'}}></span>You can edit</span>
        <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'12px',height:'12px',background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:'3px',display:'inline-block'}}></span>View only</span>
        <span style={{display:'flex',alignItems:'center',gap:'4px'}}><span style={{width:'12px',height:'12px',background:'rgba(245,158,11,.15)',border:'1px solid var(--warning)',borderRadius:'3px',display:'inline-block'}}></span>Has edits</span>
      </div>}

      {/* Excel table */}
      {rows.length===0?<div style={{textAlign:'center',padding:'40px',color:'var(--text3)'}}>This sheet is empty</div>:(
        <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'520px',border:'1px solid var(--border)',borderRadius:'var(--radius)'}}>
          <table style={{borderCollapse:'collapse',minWidth:'100%',fontSize:'12.5px'}}>
            <thead style={{position:'sticky',top:0,zIndex:2}}>
              <tr style={{background:'var(--surface2)'}}>
                <th style={{padding:'9px 10px',textAlign:'center',fontWeight:600,color:'var(--text3)',fontSize:'11px',borderRight:'1px solid var(--border)',minWidth:'40px',background:'var(--surface2)'}}>#</th>
                {cols.map(col=>{
                  const editable=canEditCol(col);
                  return <th key={col} style={{padding:'9px 12px',textAlign:'left',fontWeight:600,fontSize:'11px',whiteSpace:'nowrap',
                    color:editable?'var(--accent)':'var(--text3)',
                    background:editable?'rgba(79,110,247,.08)':'var(--surface2)',
                    borderRight:'1px solid var(--border)',minWidth:'120px',cursor:editable?'pointer':'default'}}
                    title={editable?'You can edit this column':'View only'}>
                    {col}{editable&&<span style={{marginLeft:'4px',fontSize:'9px',opacity:.7}}>✏️</span>}
                  </th>;
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row,ri)=>(
                <tr key={ri} style={{background:ri%2===0?'transparent':'rgba(255,255,255,.015)'}}>
                  <td style={{padding:'7px 10px',borderTop:'1px solid var(--border)',borderRight:'1px solid var(--border)',color:'var(--text3)',textAlign:'center',fontSize:'11px'}}>{ri+1}</td>
                  {cols.map(col=>{
                    const editable=canEditCol(col);
                    const isEditing=editCell?.rowIdx===ri&&editCell?.col===col;
                    const overlay=getEditOverlay(ri,col);
                    const val=overlay?overlay.new_value:row[col];
                    return (
                      <td key={col} onDoubleClick={()=>startEdit(ri,col,val)}
                        style={{padding:'7px 12px',borderTop:'1px solid var(--border)',borderRight:'1px solid var(--border)',
                          whiteSpace:'nowrap',maxWidth:'240px',overflow:'hidden',textOverflow:'ellipsis',
                          background:isEditing?'rgba(79,110,247,.1)':overlay?'rgba(245,158,11,.08)':editable?'rgba(79,110,247,.03)':'transparent',
                          cursor:editable?'pointer':'default',
                          outline:isEditing?'2px solid var(--accent)':'none',
                          title:String(val??'')}}>
                        {isEditing?(
                          <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                            <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)}
                              onKeyDown={e=>{if(e.key==='Enter')saveEdit();if(e.key==='Escape')setEditCell(null);}}
                              style={{background:'var(--surface)',border:'1px solid var(--accent)',borderRadius:'4px',color:'var(--text)',padding:'3px 6px',fontSize:'12px',outline:'none',width:'140px'}}/>
                            <button onClick={saveEdit} disabled={saving} style={{background:'var(--success)',border:'none',borderRadius:'4px',color:'#fff',padding:'3px 7px',cursor:'pointer',fontSize:'11px'}}>✓</button>
                            <button onClick={()=>setEditCell(null)} style={{background:'var(--surface3)',border:'none',borderRadius:'4px',color:'var(--text3)',padding:'3px 7px',cursor:'pointer',fontSize:'11px'}}>✕</button>
                          </div>
                        ):(
                          <span title={String(val??'')} style={{color:overlay?'var(--warning)':'var(--text)'}}>
                            {String(val??'')||<span style={{color:'var(--text3)',fontSize:'11px'}}>—</span>}
                            {overlay&&<span title={`Edited by ${overlay.user_name}`} style={{marginLeft:'4px',fontSize:'9px',opacity:.7}}>✏️</span>}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!isManager&&<div style={{marginTop:'10px',fontSize:'12px',color:'var(--text3)'}}>💡 Double-click on a highlighted column cell to edit. Other columns are view-only for you.</div>}
      {isManager&&<div style={{marginTop:'10px',fontSize:'12px',color:'var(--text3)'}}>💡 Double-click any cell to edit. All changes are logged with your name and timestamp.</div>}
    </div>
  );
}

export default function ProjectDetail(){
  const {id}=useParams();
  const navigate=useNavigate();
  const {isManager}=useAuth();
  const [project,setProject]=useState(null);
  const [tasks,setTasks]=useState([]);
  const [milestones,setMilestones]=useState([]);
  const [history,setHistory]=useState([]);
  const [loading,setLoading]=useState(true);
  const [activeTab,setActiveTab]=useState(0);
  const [uploading,setUploading]=useState(false);
  const [showPerms,setShowPerms]=useState(false);

  const load=async()=>{
    try{
      const [p,t,m]=await Promise.all([api.get(`/projects/${id}`),api.get(`/tasks/project/${id}`),api.get('/milestones')]);
      setProject(p.data);setTasks(t.data);setMilestones(m.data.filter(x=>x.project_id==id));
      if(isManager){try{const h=await api.get(`/projects/${id}/import-history`);setHistory(h.data);}catch{}}
    }catch{navigate('/projects');}
    finally{setLoading(false);}
  };
  useEffect(()=>{load();},[id]);

  const handleUpload=async e=>{
    const file=e.target.files[0];if(!file)return;
    const fd=new FormData();fd.append('excel',file);
    setUploading(true);
    try{
      const r=await api.post(`/projects/${id}/upload-excel`,fd,{headers:{'Content-Type':'multipart/form-data'}});
      toast(`Uploaded: ${r.data.sheets} sheets, ${r.data.rows} rows ✓`);load();
    }catch(err){toast(err.response?.data?.error||'Upload failed','error');}
    finally{setUploading(false);e.target.value='';}
  };

  const tabs=['Overview','Tasks','Milestones','Excel Viewer',...(isManager?['Import History']:[])];

  if(loading) return <Page title="Project"><Spinner/></Page>;
  if(!project) return null;

  return (
    <Page title={project.name} activeTab={activeTab} tabs={tabs} onTabChange={setActiveTab}
      action={<div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
        {isManager&&<>
          <label style={{padding:'7px 14px',borderRadius:'8px',background:'var(--surface2)',border:'1px solid var(--border)',color:uploading?'var(--text3)':'var(--text2)',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
            {uploading?'Uploading...':'📤 Upload Excel'}
            <input type="file" accept=".xlsx,.xls,.xlsb,.csv" onChange={handleUpload} style={{display:'none'}} disabled={uploading}/>
          </label>
          <Btn variant="ghost" size="sm" onClick={()=>window.open(`/api/projects/${id}/excel-export`,'_blank')}>⬇️ Export</Btn>
          {project.excel_file_name&&<Btn variant="ghost" size="sm" onClick={()=>window.open(`/api/projects/${id}/excel`,'_blank')}>📥 Download Original</Btn>}
          <Btn variant="ghost" size="sm" onClick={()=>setShowPerms(true)}>🔐 Column Permissions</Btn>
        </>}
      </div>}>

      {/* OVERVIEW */}
      {activeTab===0&&<div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'20px'}}>
            <h3 style={{fontSize:'14px',fontWeight:700,marginBottom:'14px'}}>Project Info</h3>
            {[['Status',<Badge status={project.status}/>],['Priority',<Priority level={project.priority}/>],
              ['Progress',<Progress value={project.progress||0}/>],
              ['Start',<DueDate date={project.start_date}/>],['End',<DueDate date={project.end_date}/>],
              ['Manager',project.manager_name||'—'],
              ['Excel File',project.excel_file_name?<span style={{color:'var(--success)',fontSize:'12px'}}>✅ {project.excel_file_name}</span>:<span style={{color:'var(--text3)',fontSize:'12px'}}>Not uploaded yet</span>],
            ].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <span style={{fontSize:'12.5px',color:'var(--text3)'}}>{k}</span><span style={{fontSize:'13px'}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'20px'}}>
            <h3 style={{fontSize:'14px',fontWeight:700,marginBottom:'14px'}}>Team Members</h3>
            {(project.members||[]).map(m=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <Avatar name={m.name} size={34}/>
                <div><div style={{fontSize:'13px',fontWeight:600}}>{m.name}</div><div style={{fontSize:'11px',color:'var(--text3)',textTransform:'capitalize'}}>{m.role}</div></div>
              </div>
            ))}
            {!project.members?.length&&<div style={{color:'var(--text3)',fontSize:'13px'}}>No members assigned yet</div>}
          </div>
        </div>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'20px'}}>
          <h3 style={{fontSize:'14px',fontWeight:700,marginBottom:'8px'}}>Description</h3>
          <p style={{color:'var(--text2)',fontSize:'13.5px',lineHeight:1.6}}>{project.description||'No description'}</p>
        </div>
      </div>}

      {/* TASKS */}
      {activeTab===1&&<Table headers={['Task','Assignee','Status','Priority','Due Date']}>
        {tasks.map(t=>(
          <tr key={t.id}>
            <Td><div style={{fontWeight:600}}>{t.title}</div><div style={{fontSize:'11px',color:'var(--text3)'}}>{t.description}</div></Td>
            <Td>{t.assignee_name||'Unassigned'}</Td>
            <Td><Badge status={t.status}/></Td>
            <Td><Priority level={t.priority}/></Td>
            <Td><DueDate date={t.due_date}/></Td>
          </tr>
        ))}
      </Table>}

      {/* MILESTONES */}
      {activeTab===2&&<Table headers={['Milestone','Status','Due','Notes']}>
        {milestones.map(m=>(
          <tr key={m.id}>
            <Td style={{fontWeight:600}}>{m.title}</Td>
            <Td><Badge status={m.status}/></Td>
            <Td><DueDate date={m.due_date}/></Td>
            <Td style={{color:'var(--text3)',fontSize:'12px'}}>{m.description||'—'}</Td>
          </tr>
        ))}
      </Table>}

      {/* EXCEL VIEWER */}
      {activeTab===3&&<ExcelViewer projectId={id} isManager={isManager}/>}

      {/* IMPORT HISTORY */}
      {activeTab===4&&isManager&&<Table headers={['File','Imported By','Sheets','Rows','Status','Date']}>
        {history.map(h=>(
          <tr key={h.id}>
            <Td style={{fontWeight:600}}>{h.file_name}</Td>
            <Td>{h.imported_by_name||'—'}</Td>
            <Td>{h.sheet_count}</Td>
            <Td>{h.row_count}</Td>
            <Td><Badge status={h.status==='success'?'active':'blocked'}/></Td>
            <Td><span style={{fontSize:'12px',color:'var(--text3)'}}>{new Date(h.imported_at).toLocaleString('en-IN')}</span></Td>
          </tr>
        ))}
        {!history.length&&<tr><td colSpan={6} style={{padding:'40px',textAlign:'center',color:'var(--text3)'}}>No import history</td></tr>}
      </Table>}

      {showPerms&&<ColumnPermissionsModal projectId={id} members={project.members||[]} onClose={()=>setShowPerms(false)}/>}
    </Page>
  );
}
