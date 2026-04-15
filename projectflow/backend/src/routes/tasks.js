const express = require('express');
const { query } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const isPriv = req.user.role!=='member';
    const sql = `SELECT t.*,p.name as project_name,u.name as assignee_name FROM tasks t
      LEFT JOIN projects p ON p.id=t.project_id LEFT JOIN users u ON u.id=t.assignee_id
      ${isPriv?'':'WHERE t.assignee_id=$1 OR t.project_id IN (SELECT project_id FROM project_members WHERE user_id=$1)'}
      ORDER BY t.created_at DESC`;
    const r = await query(sql, isPriv?[]:[req.user.id]);
    res.json(r.rows);
  } catch(err) { res.status(500).json({ error:'Server error' }); }
});

router.get('/project/:pid', auth, async (req, res) => {
  try {
    const r = await query('SELECT t.*,u.name as assignee_name FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id WHERE t.project_id=$1 ORDER BY t.created_at DESC', [req.params.pid]);
    res.json(r.rows);
  } catch { res.status(500).json({ error:'Server error' }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title,description,project_id,assignee_id,status,priority,due_date } = req.body;
    if (!title||!project_id) return res.status(400).json({ error:'Title and project required' });
    const r = await query('INSERT INTO tasks (title,description,project_id,assignee_id,status,priority,due_date,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [title,description||null,project_id,assignee_id||null,status||'pending',priority||'med',due_date||null,req.user.id]);
    res.status(201).json(r.rows[0]);
  } catch(err) { res.status(500).json({ error:err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title,description,assignee_id,status,priority,due_date,project_id } = req.body;
    const r = await query('UPDATE tasks SET title=$1,description=$2,assignee_id=$3,status=$4,priority=$5,due_date=$6,project_id=$7,updated_at=NOW() WHERE id=$8 RETURNING *',
      [title,description||null,assignee_id||null,status,priority,due_date||null,project_id,req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error:'Not found' });
    res.json(r.rows[0]);
  } catch(err) { res.status(500).json({ error:err.message }); }
});

router.delete('/:id', auth, requireRole('admin','manager'), async (req, res) => {
  try { await query('DELETE FROM tasks WHERE id=$1',[req.params.id]); res.json({message:'Deleted'}); }
  catch { res.status(500).json({ error:'Server error' }); }
});
module.exports = router;
