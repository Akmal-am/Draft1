const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, requireRole('admin','manager'), async (req, res) => {
  try {
    const r = await query('SELECT id,name,email,role,department,is_active,created_at FROM users ORDER BY name');
    res.json(r.rows);
  } catch { res.status(500).json({ error:'Server error' }); }
});

router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name||!email||!password) return res.status(400).json({ error:'Name, email, password required' });
    if (password.length < 6) return res.status(400).json({ error:'Password min 6 chars' });
    const exists = await query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error:'Email already in use' });
    const hash = await bcrypt.hash(password, 12);
    const r = await query(
      'INSERT INTO users (name,email,password_hash,role,department) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role,department,created_at',
      [name, email.toLowerCase(), hash, role||'member', department||null]
    );
    res.status(201).json(r.rows[0]);
  } catch(err) { res.status(500).json({ error:err.message }); }
});

router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, role, department, is_active, password } = req.body;
    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 12);
      await query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2', [hash, req.params.id]);
    }
    const r = await query(
      'UPDATE users SET name=$1,email=$2,role=$3,department=$4,is_active=$5,updated_at=NOW() WHERE id=$6 RETURNING id,name,email,role,department,is_active',
      [name, email.toLowerCase(), role, department||null, is_active!==false, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error:'User not found' });
    res.json(r.rows[0]);
  } catch(err) { res.status(500).json({ error:err.message }); }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    if (parseInt(req.params.id)===req.user.id) return res.status(400).json({ error:'Cannot delete your own account' });
    await query('UPDATE users SET is_active=false,updated_at=NOW() WHERE id=$1', [req.params.id]);
    res.json({ message:'User deactivated' });
  } catch { res.status(500).json({ error:'Server error' }); }
});

module.exports = router;
