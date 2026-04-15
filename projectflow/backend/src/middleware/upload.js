const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadDir = process.env.UPLOAD_DIR || './src/uploads';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const d = path.join(uploadDir, `project_${req.params.projectId||'general'}`);
    fs.mkdirSync(d, { recursive: true });
    cb(null, d);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `excel_${Date.now()}${ext}`);
  },
});
const fileFilter = (req, file, cb) => {
  const ok = ['.xlsx','.xls','.xlsb','.csv'].includes(path.extname(file.originalname).toLowerCase());
  ok ? cb(null,true) : cb(new Error('Only Excel/CSV files allowed'));
};
module.exports = multer({ storage, fileFilter, limits:{ fileSize:(parseInt(process.env.MAX_FILE_SIZE_MB)||50)*1024*1024 } });
