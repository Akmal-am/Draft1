const express = require('express');
const { query } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();
router.get('/', auth, async (req,res) => {
  try {
    const r=await query(`SELECT a.*,p.name as project_name,u.name as requested_by_name,u2.name as reviewed_by_name
      FROM approvals a LEFT JOIN projects p ON p.id=a.project_id LEFT JOIN users u ON u.id=a.requested_by
      LEFT JOIN users u2 ON u2.id=a.reviewed_by ORDER BY a.created_at DESC`);
    res.json(r.rows);
  } catch { res.status(500).json({error:'Server error'}); }
});
router.post('/', auth, async (req,res) => {
  try {
    const {title,type,project_id,note}=req.body;
    const r=await query('INSERT INTO approvals (title,type,project_id,requested_by,note) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [title,type,project_id,req.user.id,note||null]);
    res.status(201).json(r.rows[0]);
  } catch(err){res.status(500).json({error:err.message});}
});
router.put('/:id/review', auth, requireRole('admin','manager'), async (req,res) => {
  try {
    const {status}=req.body;
    if (!['approved','rejected'].includes(status)) return res.status(400).json({error:'Invalid status'});
    const r=await query('UPDATE approvals SET status=$1,reviewed_by=$2,reviewed_at=NOW() WHERE id=$3 RETURNING *',
      [status,req.user.id,req.params.id]);
    res.json(r.rows[0]);
  } catch { res.status(500).json({error:'Server error'}); }
});
module.exports = router;
