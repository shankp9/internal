const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Store files in a public-accessible directory
// Backend/uploads/transcripts (served via static route)
const uploadsDir = path.join(__dirname, '../uploads/transcripts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Also create public directory for frontend access
const publicDir = path.join(__dirname, '../../frontend/public/transcripts');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `transcript-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.txt', '.pdf', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only .txt, .pdf, and .docx files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
});

module.exports = {
  upload: upload.single('transcript'),
  uploadMultiple: upload.fields([{ name: 'transcript', maxCount: 1 }]),
  uploadsDir,
  publicDir,
};

