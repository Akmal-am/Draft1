import React,{useEffect,useState,useMemo} from 'react';
import {BarChart,Bar,LineChart,Line,PieChart,Pie,Cell,XAxis,YAxis,CartesianGrid,Tooltip,Legend,ResponsiveContainer} from 'recharts';
import {Page,Spinner,Avatar,FilterSelect} from '../components/common/UI';
import api from '../utils/api';

const COLORS=['#4f6ef7','#10b981','#f59e0b','#ef4444','#06b6d4','#7c3aed','#ec4899','#f97316'];
const WM_STATUS_COLORS={'Dispatched':'#10b981','Not Dispatched':'#ef4444','Hold':'#f59e0b','Closed':'#64748b','Open':'#4f6ef7','Pending':'#f59e0b'};

function Card({title,children,span=1}){
  return <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'20px',gridColumn:`span ${span}`}}>
    <h3 style={{fontSize:'14px',fontWeight:700,marginBottom:'16px',color:'var(--text)'}}>{title}</h3>
    {children}
  </div>;
}

function StatBox({label,value,color='var(--accent)',sub}){
  return <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'8px',padding:'14px',textAlign:'center'}}>
    <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'4px'}}>{label}</div>
    <div style={{fontSize:'24px',fontWeight:'700',color}}>{value}</div>
    {sub&&<div style={{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}}>{sub}</div>}
  </div>;
}

export default function TeamReportsPage(){
  const [projects,setProjects]=useState([]);
  const [users,setUsers]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [excelData,setExcelData]=useState(null);
  const [selectedProject,setSelectedProject]=useState('');
  const [loading,setLoading]=useState(true);
  const [excelLoading,setExcelLoading]=useState(false);
  const [selectedUser,setSelectedUser]=useState('');

  useEffect(()=>{
    Promise.all([api.get('/projects'),api.get('/users').catch(()=>({data:[]})),api.get('/tasks')])
      .then(([p,u,t])=>{setProjects(p.data);setUsers(u.data);setTasks(t.data);
        if(p.data.length) setSelectedProject(String(p.data[0].id));
      }).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    if(!selectedProject) return;
    setExcelLoading(true);setExcelData(null);
    api.get(`/projects/${selectedProject}/excel-data`)
      .then(r=>setExcelData(r.data))
      .catch(()=>setExcelData(null))
      .finally(()=>setExcelLoading(false));
  },[selectedProject]);

  // ── Task-based analytics ──────────────────────────────────
  const tasksByUser=useMemo(()=>{
    const filteredTasks=selectedProject?tasks.filter(t=>t.project_id==selectedProject):tasks;
    const map={};
    users.forEach(u=>{map[u.id]={name:u.name,total:0,done:0,active:0,pending:0,overdue:0};});
    filteredTasks.forEach(t=>{
      if(map[t.assignee_id]){
        map[t.assignee_id].total++;
        if(t.status==='done') map[t.assignee_id].done++;
        else if(t.status==='active') map[t.assignee_id].active++;
        else if(t.status==='pending') map[t.assignee_id].pending++;
        if(t.status!=='done'&&new Date(t.due_date)<new Date()) map[t.assignee_id].overdue++;
      }
    });
    return Object.values(map).filter(u=>u.total>0);
  },[tasks,users,selectedProject]);

  const taskStatusData=useMemo(()=>{
    const filteredTasks=selectedProject?tasks.filter(t=>t.project_id==selectedProject):tasks;
    const counts={};
    filteredTasks.forEach(t=>{counts[t.status]=(counts[t.status]||0)+1;});
    return Object.entries(counts).map(([name,value])=>({name:name.charAt(0).toUpperCase()+name.slice(1),value}));
  },[tasks,selectedProject]);

  // ── Excel-based analytics (from your MERAM data) ─────────
  const excelStats=useMemo(()=>{
    if(!excelData?.sheets) return null;
    const sheet=excelData.sheets['Sheet1']||Object.values(excelData.sheets)[0]||[];
    if(!sheet.length) return null;

    // WM Status distribution
    const wmStatus={};
    sheet.forEach(row=>{const v=row['WM Status']||row['WM_Status']||'';if(v) wmStatus[v]=(wmStatus[v]||0)+1;});

    // Spooler performance
    const spoolerMap={};
    sheet.forEach(row=>{
      const name=row['Spooler Name']||row['Spooler_Name']||'';
      if(!name) return;
      if(!spoolerMap[name]) spoolerMap[name]={name,total:0,dispatched:0,notDispatched:0,onHold:0,closed:0};
      spoolerMap[name].total++;
      const wm=(row['WM Status']||'').toLowerCase();
      if(wm.includes('dispatched')&&!wm.includes('not')) spoolerMap[name].dispatched++;
      else if(wm.includes('not dispatched')) spoolerMap[name].notDispatched++;
      else if(wm.includes('hold')) spoolerMap[name].onHold++;
      else if(wm.includes('closed')) spoolerMap[name].closed++;
    });

    // Subcontractor distribution
    const subMap={};
    sheet.forEach(row=>{const v=row['SUBCONTRACTOR']||row['Subcontractor']||'';if(v) subMap[v]=(subMap[v]||0)+1;});

    // On Hold count
    const onHoldCount=sheet.filter(r=>(r['On Hold']||'').toString().toLowerCase()==='yes'||(r['WM Status']||'').toString().toLowerCase().includes('hold')).length;

    // Train distribution
    const trainMap={};
    sheet.forEach(row=>{const v=String(row['Train']||'');if(v&&v!=='undefined') trainMap[v]=(trainMap[v]||0)+1;});

    // Iso+Eng status
    const isoStatusMap={};
    sheet.forEach(row=>{const v=row['Iso+Eng. status']||'';if(v) isoStatusMap[v]=(isoStatusMap[v]||0)+1;});

    return {
      total:sheet.length,
      wmStatusData:Object.entries(wmStatus).map(([name,value])=>({name,value})),
      spoolerData:Object.values(spoolerMap),
      subcontractorData:Object.entries(subMap).map(([name,value])=>({name,value})),
      onHoldCount,
      trainData:Object.entries(trainMap).slice(0,10).map(([name,value])=>({name,value})),
      isoStatusData:Object.entries(isoStatusMap).slice(0,8).map(([name,value])=>({name,value})),
      dispatched:Object.values(spoolerMap).reduce((s,x)=>s+x.dispatched,0),
      notDispatched:Object.values(spoolerMap).reduce((s,x)=>s+x.notDispatched,0),
    };
  },[excelData]);

  const selectedUserData=selectedUser?tasksByUser.find(u=>u.name===selectedUser):null;

  if(loading) return <Page title="Team Reports"><Spinner/></Page>;

  return (
    <Page title="📊 Team Reports & Analytics" action={
      <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
        <FilterSelect value={selectedProject} onChange={setSelectedProject} placeholder="All Projects">
          {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </FilterSelect>
      </div>
    }>

      {/* Top Stats */}
      {excelStats&&<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'12px',marginBottom:'24px'}}>
        <StatBox label="Total ISO Records" value={excelStats.total} color="var(--accent)"/>
        <StatBox label="Dispatched" value={excelStats.dispatched} color="var(--success)" sub="WM Status"/>
        <StatBox label="Not Dispatched" value={excelStats.notDispatched} color="var(--danger)" sub="WM Status"/>
        <StatBox label="On Hold" value={excelStats.onHoldCount} color="var(--warning)"/>
        <StatBox label="Spoolers Active" value={excelStats.spoolerData.length} color="var(--info)"/>
      </div>}

      {/* Task Stats from DB */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'24px'}}>
        {tasksByUser.slice(0,4).map((u,i)=>(
          <div key={u.name} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'16px',cursor:'pointer'}}
            onClick={()=>setSelectedUser(u.name===selectedUser?'':u.name)}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
              <Avatar name={u.name} size={36}/>
              <div><div style={{fontWeight:600,fontSize:'13px'}}>{u.name}</div>
                <div style={{fontSize:'11px',color:'var(--text3)'}}>{u.total} tasks assigned</div></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
              <div style={{background:'rgba(16,185,129,.1)',borderRadius:'6px',padding:'6px',textAlign:'center'}}>
                <div style={{fontSize:'16px',fontWeight:700,color:'var(--success)'}}>{u.done}</div>
                <div style={{fontSize:'10px',color:'var(--text3)'}}>Done</div>
              </div>
              <div style={{background:'rgba(239,68,68,.1)',borderRadius:'6px',padding:'6px',textAlign:'center'}}>
                <div style={{fontSize:'16px',fontWeight:700,color:'var(--danger)'}}>{u.overdue}</div>
                <div style={{fontSize:'10px',color:'var(--text3)'}}>Overdue</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'24px'}}>
        {/* Team Task Performance Bar Chart */}
        <Card title="👥 Team Task Performance">
          {tasksByUser.length?<ResponsiveContainer width="100%" height={260}>
            <BarChart data={tasksByUser} margin={{top:5,right:10,left:-20,bottom:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="name" tick={{fill:'var(--text3)',fontSize:11}} angle={-20} textAnchor="end"/>
              <YAxis tick={{fill:'var(--text3)',fontSize:11}}/>
              <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'12px'}}/>
              <Legend wrapperStyle={{fontSize:'11px',color:'var(--text3)'}}/>
              <Bar dataKey="done" fill="var(--success)" name="Done" radius={[3,3,0,0]}/>
              <Bar dataKey="active" fill="var(--accent)" name="Active" radius={[3,3,0,0]}/>
              <Bar dataKey="pending" fill="var(--warning)" name="Pending" radius={[3,3,0,0]}/>
              <Bar dataKey="overdue" fill="var(--danger)" name="Overdue" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>:<div style={{color:'var(--text3)',textAlign:'center',padding:'40px'}}>No task data</div>}
        </Card>

        {/* Task Status Pie */}
        <Card title="📋 Task Status Distribution">
          {taskStatusData.length?<ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={taskStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                labelLine={{stroke:'var(--text3)'}} fontSize={11}>
                {taskStatusData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Pie>
              <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'12px'}}/>
            </PieChart>
          </ResponsiveContainer>:<div style={{color:'var(--text3)',textAlign:'center',padding:'40px'}}>No data</div>}
        </Card>
      </div>

      {/* Excel-based charts — only shown when Excel is uploaded */}
      {excelLoading&&<div style={{textAlign:'center',padding:'40px',color:'var(--text3)'}}>Loading Excel data...</div>}
      {!excelLoading&&excelStats&&<>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'24px'}}>
          {/* WM Status Pie */}
          <Card title="📊 WM Status Distribution (from Excel)">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={excelStats.wmStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={({name,value})=>`${name}: ${value}`} labelLine={{stroke:'var(--text3)'}} fontSize={10}>
                  {excelStats.wmStatusData.map((entry,i)=><Cell key={i} fill={WM_STATUS_COLORS[entry.name]||COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'12px'}}/>
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Subcontractor Bar */}
          <Card title="🏗️ Subcontractor ISO Count (from Excel)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={excelStats.subcontractorData} layout="vertical" margin={{top:5,right:30,left:10,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis type="number" tick={{fill:'var(--text3)',fontSize:11}}/>
                <YAxis type="category" dataKey="name" tick={{fill:'var(--text2)',fontSize:12}} width={60}/>
                <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'12px'}}/>
                <Bar dataKey="value" name="ISO Count" radius={[0,4,4,0]}>
                  {excelStats.subcontractorData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Spooler Performance — Main chart from Excel */}
        <Card title="👷 Spooler Performance — WM Status Breakdown (from Excel)" span={2}>
          {excelStats.spoolerData.length?<ResponsiveContainer width="100%" height={300}>
            <BarChart data={excelStats.spoolerData} margin={{top:5,right:20,left:-10,bottom:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="name" tick={{fill:'var(--text3)',fontSize:11}} angle={-15} textAnchor="end"/>
              <YAxis tick={{fill:'var(--text3)',fontSize:11}}/>
              <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'12px'}}/>
              <Legend wrapperStyle={{fontSize:'11px',color:'var(--text3)'}}/>
              <Bar dataKey="dispatched" fill="#10b981" name="Dispatched" radius={[3,3,0,0]} stackId="a"/>
              <Bar dataKey="notDispatched" fill="#ef4444" name="Not Dispatched" radius={[0,0,0,0]} stackId="a"/>
              <Bar dataKey="onHold" fill="#f59e0b" name="On Hold" radius={[0,0,0,0]} stackId="a"/>
              <Bar dataKey="closed" fill="#64748b" name="Closed" radius={[3,3,0,0]} stackId="a"/>
            </BarChart>
          </ResponsiveContainer>:<div style={{color:'var(--text3)',textAlign:'center',padding:'40px'}}>Upload Excel to see Spooler data</div>}
        </Card>

        {/* Train Distribution + Iso+Eng Status */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginTop:'20px'}}>
          <Card title="🚂 Train Distribution (from Excel)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={excelStats.trainData} margin={{top:5,right:10,left:-20,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="name" tick={{fill:'var(--text3)',fontSize:11}}/>
                <YAxis tick={{fill:'var(--text3)',fontSize:11}}/>
                <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'12px'}}/>
                <Bar dataKey="value" name="Count" radius={[4,4,0,0]}>
                  {excelStats.trainData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="📐 Iso+Eng Status (from Excel)">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={excelStats.isoStatusData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                  label={({name,value})=>`${(name||'').slice(0,12)}: ${value}`} labelLine={{stroke:'var(--text3)'}} fontSize={10}>
                  {excelStats.isoStatusData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'12px'}}/>
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </>}

      {/* Individual user drill-down */}
      {selectedUserData&&<div style={{marginTop:'24px',background:'var(--surface)',border:'1px solid var(--accent)',borderRadius:'var(--radius)',padding:'20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
          <Avatar name={selectedUserData.name} size={40}/>
          <div>
            <h3 style={{fontSize:'16px',fontWeight:700}}>{selectedUserData.name}</h3>
            <div style={{fontSize:'12px',color:'var(--text3)'}}>Individual Performance Report</div>
          </div>
          <button onClick={()=>setSelectedUser('')} style={{marginLeft:'auto',background:'none',border:'1px solid var(--border)',borderRadius:'8px',padding:'5px 10px',color:'var(--text3)',cursor:'pointer',fontSize:'12px'}}>✕ Close</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'12px'}}>
          {[['Total',selectedUserData.total,'var(--accent)'],['Done',selectedUserData.done,'var(--success)'],
            ['Active',selectedUserData.active,'var(--info)'],['Pending',selectedUserData.pending,'var(--warning)'],
            ['Overdue',selectedUserData.overdue,'var(--danger)']].map(([l,v,c])=>(
            <div key={l} style={{background:'var(--surface2)',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:'22px',fontWeight:700,color:c}}>{v}</div>
              <div style={{fontSize:'11px',color:'var(--text3)'}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:'12px'}}>
          <div style={{fontSize:'12px',color:'var(--text3)',marginBottom:'6px'}}>Completion Rate</div>
          <div style={{height:'8px',background:'var(--surface3)',borderRadius:'99px',overflow:'hidden'}}>
            <div style={{height:'100%',width:`${selectedUserData.total?Math.round(selectedUserData.done/selectedUserData.total*100):0}%`,background:'var(--success)',borderRadius:'99px',transition:'width .5s'}}/>
          </div>
          <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}}>{selectedUserData.total?Math.round(selectedUserData.done/selectedUserData.total*100):0}% complete</div>
        </div>
      </div>}

      {!excelLoading&&!excelStats&&selectedProject&&<div style={{marginTop:'16px',background:'rgba(79,110,247,.06)',border:'1px solid rgba(79,110,247,.2)',borderRadius:'var(--radius)',padding:'24px',textAlign:'center',color:'var(--text3)'}}>
        <div style={{fontSize:'32px',marginBottom:'8px'}}>📊</div>
        <div style={{fontSize:'14px',marginBottom:'4px'}}>No Excel data available for this project</div>
        <div style={{fontSize:'12px'}}>Upload an Excel file in the Project Detail page to see WM Status, Spooler, and Train analytics</div>
      </div>}
    </Page>
  );
}
