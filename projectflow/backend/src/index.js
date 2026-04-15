require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL||'http://localhost:5173', credentials:true }));
app.use(express.json({ limit:'10mb' }));
app.use(express.urlencoded({ extended:true }));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/projects',   require('./routes/projects'));
app.use('/api/tasks',      require('./routes/tasks'));
app.use('/api/milestones', require('./routes/milestones'));
app.use('/api/approvals',  require('./routes/approvals'));
app.get('/api/health', (req,res) => res.json({ status:'ok', time:new Date() }));

if (process.env.NODE_ENV==='production') {
  app.use(express.static(path.join(__dirname,'../../frontend/dist')));
  app.get('*', (req,res) => res.sendFile(path.join(__dirname,'../../frontend/dist/index.html')));
}
app.use((err,req,res,next) => {
  if (err.code==='LIMIT_FILE_SIZE') return res.status(413).json({error:'File too large'});
  res.status(500).json({error:err.message||'Server error'});
});

const PORT = process.env.PORT||5000;
app.listen(PORT, () => console.log(`ProjectFlow API → http://localhost:${PORT}`));
