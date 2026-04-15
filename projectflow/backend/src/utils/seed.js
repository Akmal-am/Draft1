const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const seed = async () => {
  const client = await pool.connect();
  try {
    const ah = await bcrypt.hash('Admin@123',12);
    const mh = await bcrypt.hash('Manager@123',12);
    const uh = await bcrypt.hash('Member@123',12);
    await client.query(`INSERT INTO users (name,email,password_hash,role,department) VALUES
      ('Admin User','admin@company.com','${ah}','admin','IT'),
      ('Priya Sharma','priya@company.com','${mh}','manager','Operations'),
      ('Sandeep Kumar','sandeep@company.com','${uh}','member','Spooling'),
      ('Rohan Verma','rohan@company.com','${uh}','member','Spooling'),
      ('Gokul Nair','gokul@company.com','${uh}','member','Spooling'),
      ('Irfan Khan','irfan@company.com','${uh}','member','Engineering'),
      ('Swapna Rao','swapna@company.com','${uh}','member','QA')
      ON CONFLICT (email) DO NOTHING;`);
    const p1 = await client.query(`INSERT INTO projects (name,description,status,priority,progress,start_date,end_date,manager_id,created_by)
      VALUES ('OE45-WMOE-49','Workfront MERAM Project — Train 516/517/518','active','high',65,'2025-12-01','2026-06-30',2,1) RETURNING id;`);
    const pid = p1.rows[0].id;
    await client.query(`INSERT INTO project_members (project_id,user_id) VALUES (${pid},2),(${pid},3),(${pid},4),(${pid},5),(${pid},6),(${pid},7) ON CONFLICT DO NOTHING;`);
    await client.query(`INSERT INTO tasks (title,project_id,assignee_id,status,priority,due_date,created_by) VALUES
      ('Update WM Status for Train 516',${pid},3,'active','high','2026-04-20',1),
      ('Remap spools due to QC review',${pid},4,'pending','high','2026-04-25',1),
      ('Close Engg Case#15 items',${pid},6,'active','med','2026-04-18',1),
      ('NDE data verification',${pid},7,'review','high','2026-04-15',1),
      ('SPOOLGEN regeneration — Train 517',${pid},5,'pending','med','2026-05-01',1);`);
    await client.query(`INSERT INTO milestones (title,project_id,due_date,status,created_by) VALUES
      ('Train 516 dispatch complete',${pid},'2026-04-30','active',1),
      ('Train 517 spool review done',${pid},'2026-05-15','pending',1);`);
    // Set column permissions: Sandeep (id=3) can edit WM Status, Spooler Name
    await client.query(`INSERT INTO column_permissions (project_id,user_id,column_name,can_edit) VALUES
      (${pid},3,'WM Status',true),(${pid},3,'Spooler Name',true),(${pid},3,'On Hold',true),
      (${pid},4,'WM Status',true),(${pid},4,'Spooler Name',true),
      (${pid},5,'Iso+Eng. status',true),(${pid},5,'Weldmap Rev',true),
      (${pid},6,'Eng. Rev',true),(${pid},6,'PDS Model',true),(${pid},6,'Iso+Eng. status',true),
      (${pid},7,'Drawing Amended (Yes/No)',true),(${pid},7,'WM Status',true)
      ON CONFLICT DO NOTHING;`);
    console.log('Seed done');
    console.log('admin@company.com / Admin@123');
    console.log('priya@company.com / Manager@123');
    console.log('sandeep@company.com / Member@123');
  } catch(err) { console.error(err.message); }
  finally { client.release(); pool.end(); }
};
seed();
