const express = require('express');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { query, pool } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// GET /api/projects
router.get('/', auth, async (req, res) => {
  try {
    let sql, params = [];
    const base = `
      SELECT p.*, u.name as manager_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id) as task_count,
        (SELECT json_agg(json_build_object('id',usr.id,'name',usr.name,'role',usr.role,'email',usr.email))
         FROM project_members pm JOIN users usr ON usr.id=pm.user_id WHERE pm.project_id=p.id) as members
      FROM projects p LEFT JOIN users u ON u.id=p.manager_id`;
    if (req.user.role==='admin'||req.user.role==='manager') {
      sql = base + ' ORDER BY p.created_at DESC';
    } else {
      sql = base + ' WHERE p.id IN (SELECT project_id FROM project_members WHERE user_id=$1) OR p.manager_id=$1 ORDER BY p.created_at DESC';
      params = [req.user.id];
    }
    const r = await query(sql, params);
    res.json(r.rows);
  } catch(err) { console.error(err); res.status(500).json({ error:'Server error' }); }
});

// GET /api/projects/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const r = await query(`
      SELECT p.*, u.name as manager_name,
        (SELECT json_agg(json_build_object('id',usr.id,'name',usr.name,'role',usr.role,'email',usr.email))
         FROM project_members pm JOIN users usr ON usr.id=pm.user_id WHERE pm.project_id=p.id) as members
      FROM projects p LEFT JOIN users u ON u.id=p.manager_id WHERE p.id=$1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error:'Not found' });
    res.json(r.rows[0]);
  } catch { res.status(500).json({ error:'Server error' }); }
});

// POST /api/projects
router.post('/', auth, requireRole('admin','manager'), async (req, res) => {
  try {
    const { name, description, status, priority, progress, start_date, end_date, manager_id, member_ids } = req.body;
    if (!name) return res.status(400).json({ error:'Name required' });
    const r = await query(
      'INSERT INTO projects (name,description,status,priority,progress,start_date,end_date,manager_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [name, description||null, status||'active', priority||'med', progress||0, start_date||null, end_date||null, manager_id||req.user.id, req.user.id]
    );
    const pid = r.rows[0].id;
    if (member_ids?.length) {
      const vals = member_ids.map(uid=>`(${pid},${uid})`).join(',');
      await query(`INSERT INTO project_members (project_id,user_id) VALUES ${vals} ON CONFLICT DO NOTHING`);
    }
    res.status(201).json(r.rows[0]);
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// PUT /api/projects/:id
router.put('/:id', auth, requireRole('admin','manager'), async (req, res) => {
  try {
    const { name, description, status, priority, progress, start_date, end_date, manager_id, member_ids } = req.body;
    const r = await query(
      'UPDATE projects SET name=$1,description=$2,status=$3,priority=$4,progress=$5,start_date=$6,end_date=$7,manager_id=$8,updated_at=NOW() WHERE id=$9 RETURNING *',
      [name, description||null, status, priority, progress||0, start_date||null, end_date||null, manager_id, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error:'Not found' });
    if (member_ids !== undefined) {
      await query('DELETE FROM project_members WHERE project_id=$1', [req.params.id]);
      if (member_ids.length) {
        const vals = member_ids.map(uid=>`(${req.params.id},${uid})`).join(',');
        await query(`INSERT INTO project_members (project_id,user_id) VALUES ${vals} ON CONFLICT DO NOTHING`);
      }
    }
    res.json(r.rows[0]);
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// DELETE /api/projects/:id
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try { await query('DELETE FROM projects WHERE id=$1', [req.params.id]); res.json({ message:'Deleted' }); }
  catch { res.status(500).json({ error:'Server error' }); }
});

// POST /api/projects/:projectId/upload-excel
router.post('/:projectId/upload-excel', auth, requireRole('admin','manager'), upload.single('excel'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error:'No file uploaded' });
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetCount = workbook.SheetNames.length;
    let rowCount = 0;
    workbook.SheetNames.forEach(sn => { rowCount += (XLSX.utils.sheet_to_json(workbook.Sheets[sn])||[]).length; });
    await query('UPDATE projects SET excel_file_name=$1,excel_file_path=$2,excel_uploaded_at=NOW(),excel_uploaded_by=$3,updated_at=NOW() WHERE id=$4',
      [req.file.originalname, req.file.path, req.user.id, req.params.projectId]);
    await query('INSERT INTO excel_imports (project_id,file_name,file_path,imported_by,row_count,sheet_count,status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [req.params.projectId, req.file.originalname, req.file.path, req.user.id, rowCount, sheetCount, 'success']);
    res.json({ message:'Excel uploaded successfully', file:req.file.originalname, sheets:sheetCount, rows:rowCount });
  } catch(err) {
    await query('INSERT INTO excel_imports (project_id,file_name,imported_by,status,error_log) VALUES ($1,$2,$3,$4,$5)',
      [req.params.projectId, req.file?.originalname, req.user.id, 'error', err.message]).catch(()=>{});
    res.status(500).json({ error:'Failed to process Excel: '+err.message });
  }
});

// GET /api/projects/:projectId/excel-data — returns parsed sheet data + user's editable columns
router.get('/:projectId/excel-data', auth, async (req, res) => {
  try {
    const proj = await query('SELECT excel_file_path FROM projects WHERE id=$1', [req.params.projectId]);
    if (!proj.rows[0]?.excel_file_path) return res.status(404).json({ error:'No Excel file yet' });
    const fp = proj.rows[0].excel_file_path;
    if (!fs.existsSync(fp)) return res.status(404).json({ error:'File not found on disk' });
    const workbook = XLSX.readFile(fp);
    const sheets = {};
    workbook.SheetNames.forEach(sn => { sheets[sn] = XLSX.utils.sheet_to_json(workbook.Sheets[sn]); });

    // Get this user's column permissions for this project
    const isManager = req.user.role==='admin'||req.user.role==='manager';
    let editableCols = [];
    if (!isManager) {
      const perms = await query('SELECT column_name FROM column_permissions WHERE project_id=$1 AND user_id=$2 AND can_edit=true',
        [req.params.projectId, req.user.id]);
      editableCols = perms.rows.map(r=>r.column_name);
    }

    res.json({ sheets, sheetNames:workbook.SheetNames, editableColumns:isManager?'ALL':editableCols, isManager });
  } catch(err) { res.status(500).json({ error:'Failed to read Excel: '+err.message }); }
});

// POST /api/projects/:projectId/excel-cell — member edits a cell (if permitted)
router.post('/:projectId/excel-cell', auth, async (req, res) => {
  try {
    const { sheet_name, row_index, column_name, new_value } = req.body;
    const isManager = req.user.role==='admin'||req.user.role==='manager';
    if (!isManager) {
      const perm = await query('SELECT can_edit FROM column_permissions WHERE project_id=$1 AND user_id=$2 AND column_name=$3',
        [req.params.projectId, req.user.id, column_name]);
      if (!perm.rows[0]?.can_edit) return res.status(403).json({ error:'You cannot edit this column' });
    }
    await query('INSERT INTO excel_edits (project_id,user_id,sheet_name,row_index,column_name,new_value) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.projectId, req.user.id, sheet_name, row_index, column_name, new_value]);
    res.json({ message:'Edit recorded' });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// GET /api/projects/:projectId/excel-edits — get all edits for overlay
router.get('/:projectId/excel-edits', auth, async (req, res) => {
  try {
    const r = await query(`SELECT ee.*, u.name as user_name FROM excel_edits ee LEFT JOIN users u ON u.id=ee.user_id
      WHERE ee.project_id=$1 ORDER BY ee.edited_at DESC`, [req.params.projectId]);
    res.json(r.rows);
  } catch { res.status(500).json({ error:'Server error' }); }
});

// GET /api/projects/:projectId/excel — download original
router.get('/:projectId/excel', auth, requireRole('admin','manager'), async (req, res) => {
  try {
    const r = await query('SELECT excel_file_path,excel_file_name FROM projects WHERE id=$1', [req.params.projectId]);
    if (!r.rows[0]?.excel_file_path) return res.status(404).json({ error:'No file' });
    if (!fs.existsSync(r.rows[0].excel_file_path)) return res.status(404).json({ error:'File missing on disk' });
    res.download(r.rows[0].excel_file_path, r.rows[0].excel_file_name);
  } catch { res.status(500).json({ error:'Server error' }); }
});

// GET /api/projects/:projectId/excel-export — export DB data as xlsx
router.get('/:projectId/excel-export', auth, requireRole('admin','manager'), async (req, res) => {
  try {
    const proj = await query('SELECT * FROM projects WHERE id=$1', [req.params.projectId]);
    const tasks = await query('SELECT t.*,u.name as assignee_name FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id WHERE t.project_id=$1', [req.params.projectId]);
    const milestones = await query('SELECT * FROM milestones WHERE project_id=$1', [req.params.projectId]);
    const edits = await query('SELECT ee.*,u.name as user_name FROM excel_edits ee LEFT JOIN users u ON u.id=ee.user_id WHERE ee.project_id=$1 ORDER BY ee.edited_at DESC', [req.params.projectId]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([proj.rows[0]]), 'Project Info');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasks.rows.length?tasks.rows:[{note:'No tasks'}]), 'Tasks');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(milestones.rows.length?milestones.rows:[{note:'No milestones'}]), 'Milestones');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(edits.rows.length?edits.rows:[{note:'No edits'}]), 'Edit Log');
    const buf = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="project_${req.params.projectId}_export.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch(err) { res.status(500).json({ error:'Export failed: '+err.message }); }
});

// GET /api/projects/:projectId/import-history
router.get('/:projectId/import-history', auth, requireRole('admin','manager'), async (req, res) => {
  try {
    const r = await query('SELECT ei.*,u.name as imported_by_name FROM excel_imports ei LEFT JOIN users u ON u.id=ei.imported_by WHERE ei.project_id=$1 ORDER BY ei.imported_at DESC LIMIT 20', [req.params.projectId]);
    res.json(r.rows);
  } catch { res.status(500).json({ error:'Server error' }); }
});

// GET /api/projects/:projectId/column-permissions — get all user column perms
router.get('/:projectId/column-permissions', auth, requireRole('admin','manager'), async (req, res) => {
  try {
    const r = await query('SELECT cp.*,u.name as user_name FROM column_permissions cp LEFT JOIN users u ON u.id=cp.user_id WHERE cp.project_id=$1 ORDER BY u.name,cp.column_name', [req.params.projectId]);
    res.json(r.rows);
  } catch { res.status(500).json({ error:'Server error' }); }
});

// POST /api/projects/:projectId/column-permissions — set permissions (admin/manager)
router.post('/:projectId/column-permissions', auth, requireRole('admin','manager'), async (req, res) => {
  try {
    const { user_id, column_name, can_edit } = req.body;
    await query(`INSERT INTO column_permissions (project_id,user_id,column_name,can_edit) VALUES ($1,$2,$3,$4)
      ON CONFLICT (project_id,user_id,column_name) DO UPDATE SET can_edit=$4`,
      [req.params.projectId, user_id, column_name, can_edit]);
    res.json({ message:'Permission saved' });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// POST /api/projects/:projectId/column-permissions/bulk — save all at once
router.post('/:projectId/column-permissions/bulk', auth, requireRole('admin','manager'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { permissions } = req.body; // [{ user_id, column_name, can_edit }]
    await client.query('BEGIN');
    await client.query('DELETE FROM column_permissions WHERE project_id=$1', [req.params.projectId]);
    for (const p of permissions) {
      await client.query('INSERT INTO column_permissions (project_id,user_id,column_name,can_edit) VALUES ($1,$2,$3,$4)',
        [req.params.projectId, p.user_id, p.column_name, p.can_edit]);
    }
    await client.query('COMMIT');
    res.json({ message:`${permissions.length} permissions saved` });
  } catch(err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error:err.message });
  } finally { client.release(); }
});

module.exports = router;
