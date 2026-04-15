const express = require('express');
const { query } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();
router.get('/', auth, async (req,res) => {
  try { const r=await query('SELECT m.*,p.name as project_name FROM milestones m LEFT JOIN projects p ON p.id=m.project_id ORDER BY m.due_date'); res.json(r.rows); }
  catch { res.status(500).json({error:'Server error'}); }
});
router.post('/', auth, requireRole('admin','manager'), async (req,res) => {
  try {
    const {title,description,project_id,due_date,status}=req.body;
    const r=await query('INSERT INTO milestones (title,description,project_id,due_date,status,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [title,description||null,project_id,due_date||null,status||'pending',req.user.id]);
    res.status(201).json(r.rows[0]);
  } catch(err){res.status(500).json({error:err.message});}
});
router.put('/:id', auth, requireRole('admin','manager'), async (req,res) => {
  try {
    const {title,description,project_id,due_date,status}=req.body;
    const r=await query('UPDATE milestones SET title=$1,description=$2,project_id=$3,due_date=$4,status=$5 WHERE id=$6 RETURNING *',
      [title,description||null,project_id,due_date||null,status,req.params.id]);
    res.json(r.rows[0]);
  } catch(err){res.status(500).json({error:err.message});}
});
router.delete('/:id', auth, requireRole('admin','manager'), async (req,res) => {
  try { await query('DELETE FROM milestones WHERE id=$1',[req.params.id]); res.json({message:'Deleted'}); }
  catch { res.status(500).json({error:'Server error'}); }
});
module.exports = router;
