const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email||!password) return res.status(400).json({ error:'Email and password required' });
    const r = await query('SELECT * FROM users WHERE email=$1 AND is_active=true', [email.toLowerCase().trim()]);
    if (!r.rows.length) return res.status(401).json({ error:'Invalid credentials' });
    const user = r.rows[0];
    if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error:'Invalid credentials' });
    const token = jwt.sign({ id:user.id, email:user.email, role:user.role, name:user.name }, process.env.JWT_SECRET, { expiresIn:process.env.JWT_EXPIRES_IN||'7d' });
    res.json({ token, user:{ id:user.id, name:user.name, email:user.email, role:user.role, department:user.department } });
  } catch(err) { console.error(err); res.status(500).json({ error:'Server error' }); }
});

router.get('/me', auth, async (req, res) => {
  try {
    const r = await query('SELECT id,name,email,role,department FROM users WHERE id=$1', [req.user.id]);
    res.json(r.rows[0]);
  } catch { res.status(500).json({ error:'Server error' }); }
});

router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword||newPassword.length<6) return res.status(400).json({ error:'Password must be at least 6 chars' });
    const r = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    if (!await bcrypt.compare(currentPassword, r.rows[0].password_hash)) return res.status(400).json({ error:'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
    res.json({ message:'Password updated' });
  } catch { res.status(500).json({ error:'Server error' }); }
});

module.exports = router;
