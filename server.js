require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// ==========================================
// Konfigurasi Multer (untuk upload file)
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Bersihkan nama file dari spasi & karakter aneh
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, uniqueSuffix + '-' + cleanName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // maks 5 MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file gambar (JPG, PNG) dan PDF yang diizinkan'));
        }
    }
});

// ==========================================
// Konfigurasi Database MySQL
// ==========================================
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_absensi',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, conn) => {
    if (err) {
        console.error('❌ Gagal terkoneksi ke database MySQL:', err.message);
    } else {
        console.log('✅ Terhubung ke database MySQL lokal');
        conn.release();
    }
});

// ==========================================
// ENDPOINT PEGAWAI (USERS)
// ==========================================

// GET semua pegawai (include photo)
app.get('/api/users', (req, res) => {
    const query = 'SELECT id, nip, full_name, email, phone, photo FROM users ORDER BY full_name ASC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error GET /api/users:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil data pegawai' });
        }
        res.json({ success: true, data: results });
    });
});

// GET pegawai by ID
app.get('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT id, nip, full_name, email, phone, photo FROM users WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error GET /api/users/:id:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil detail pegawai' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan' });
        }
        res.json({ success: true, data: results[0] });
    });
});

// POST tambah pegawai (dari halaman admin — masih pakai JSON, tanpa foto)
app.post('/api/users', async (req, res) => {
    const { nip, full_name, email, phone, password } = req.body;
    if (!nip || !full_name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Data wajib diisi lengkap' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (nip, full_name, email, phone, password) VALUES (?, ?, ?, ?, ?)';
        db.query(query, [nip, full_name, email, phone || null, hashedPassword], (err, result) => {
            if (err) {
                console.error('Error POST /api/users:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ success: false, message: 'NIP atau Email sudah terdaftar!' });
                }
                return res.status(500).json({ success: false, message: 'Gagal menambah pegawai' });
            }
            res.json({ success: true, message: 'Pegawai berhasil ditambahkan' });
        });
    } catch (err) {
        console.error('Error POST /api/users:', err);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem' });
    }
});

// ==========================================
// PUT: Update data pegawai
// ==========================================
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { nip, full_name, email, phone, password } = req.body;

    console.log('📝 Update User ID:', id);
    console.log('📝 Data received:', { nip, full_name, email, phone, password: password ? '***' : '(empty)' });

    if (!nip || !full_name || !email) {
        return res.status(400).json({ success: false, message: 'NIP, Nama, dan Email wajib diisi' });
    }

    try {
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            const query = 'UPDATE users SET nip = ?, full_name = ?, email = ?, phone = ?, password = ? WHERE id = ?';
            db.query(query, [nip, full_name, email, phone || null, hashedPassword, id], (err, result) => {
                if (err) {
                    console.error('❌ Error UPDATE with password:', err);
                    return res.status(500).json({ success: false, message: 'Gagal memperbarui data: ' + err.message });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan' });
                }
                res.json({ success: true, message: 'Data pegawai berhasil diperbarui' });
            });
        } else {
            const query = 'UPDATE users SET nip = ?, full_name = ?, email = ?, phone = ? WHERE id = ?';
            db.query(query, [nip, full_name, email, phone || null, id], (err, result) => {
                if (err) {
                    console.error('❌ Error UPDATE without password:', err);
                    return res.status(500).json({ success: false, message: 'Gagal memperbarui data: ' + err.message });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan' });
                }
                res.json({ success: true, message: 'Data pegawai berhasil diperbarui' });
            });
        }
    } catch (err) {
        console.error('❌ Error in update endpoint:', err);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem: ' + err.message });
    }
});

// ==========================================
// ✅ PUT: Update FOTO PROFIL pegawai (baru!)
// ==========================================
app.put('/api/users/:id/photo', upload.single('photo'), (req, res) => {
    const { id } = req.params;

    console.log('📸 Update Foto User ID:', id);

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });
    }

    const photoPath = `/uploads/${req.file.filename}`;

    db.query('UPDATE users SET photo = ? WHERE id = ?', [photoPath, id], (err, result) => {
        if (err) {
            console.error('❌ Error PUT /api/users/:id/photo:', err);
            return res.status(500).json({ success: false, message: 'Gagal update foto profil: ' + err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan' });
        }

        console.log('✅ Foto berhasil diperbarui:', photoPath);

        res.json({
            success: true,
            message: 'Foto profil berhasil diperbarui',
            photo: photoPath
        });
    });
});

// DELETE pegawai
app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM users WHERE id = ?', [id], (err) => {
        if (err) {
            console.error('Error DELETE /api/users/:id:', err);
            return res.status(500).json({ success: false, message: 'Gagal menghapus pegawai' });
        }
        res.json({ success: true, message: 'Pegawai berhasil dihapus' });
    });
});

// ==========================================
// ENDPOINT ABSENSI (ATTENDANCE)
// ==========================================

app.post('/api/attendance/scan', (req, res) => {
    const { qr_payload } = req.body;
    if (!qr_payload) return res.status(400).json({ success: false, message: 'QR Code tidak valid' });

    db.query('SELECT id, full_name FROM users WHERE nip = ?', [qr_payload], (err, users) => {
        if (err || users.length === 0) {
            return res.status(404).json({ success: false, message: 'Pegawai dengan NIP tersebut tidak ditemukan' });
        }

        const user = users[0];
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        const isLate = hours > 10 || (hours === 10 && minutes > 0);
        const status = isLate ? 'Terlambat' : 'Masuk';

        const insertQuery = 'INSERT INTO attendances (user_id, scan_time, status) VALUES (?, NOW(), ?)';
        db.query(insertQuery, [user.id, status], (err) => {
            if (err) {
                console.error('Error POST /api/attendance/scan:', err);
                return res.status(500).json({ success: false, message: 'Gagal menyimpan absensi' });
            }

            res.json({
                success: true,
                message: `Absensi Berhasil! [${user.full_name}] Status: ${status}`
            });
        });
    });
});

app.get('/api/attendance', (req, res) => {
    const { date } = req.query;
    let query = `
        SELECT a.id, a.scan_time, a.status, u.nip, u.full_name 
        FROM attendances a 
        LEFT JOIN users u ON a.user_id = u.id 
    `;
    let queryParams = [];

    if (date) {
        query += ` WHERE DATE(a.scan_time) = ?`;
        queryParams.push(date);
    }

    query += ` ORDER BY a.scan_time DESC`;

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error GET /api/attendance:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil data absensi' });
        }
        res.json({ success: true, data: results });
    });
});

// ==========================================
// ENDPOINT IZIN / CUTI (LEAVES)
// ==========================================

app.post('/api/leaves', upload.single('attachment'), (req, res) => {
    const { nip, type, start_date, end_date, reason } = req.body;

    if (!nip || !type || !start_date || !end_date || !reason) {
        return res.status(400).json({ success: false, message: 'Data pengajuan izin belum lengkap' });
    }

    const attachment = req.file ? `/uploads/${req.file.filename}` : null;
    const query = 'INSERT INTO leaves (nip, type, start_date, end_date, reason, attachment, status) VALUES (?, ?, ?, ?, ?, ?, "Pending")';

    db.query(query, [nip, type, start_date, end_date, reason, attachment], (err, result) => {
        if (err) {
            console.error('Error POST /api/leaves:', err);
            return res.status(500).json({ success: false, message: 'Gagal menyimpan pengajuan ke database' });
        }
        res.json({ success: true, message: 'Pengajuan izin berhasil dikirim' });
    });
});

app.get('/api/leaves', (req, res) => {
    const { nip } = req.query;
    let query = `
        SELECT l.*, u.full_name 
        FROM leaves l 
        LEFT JOIN users u ON l.nip = u.nip
    `;
    let queryParams = [];

    if (nip) {
        query += ' WHERE l.nip = ?';
        queryParams.push(nip);
    }

    query += ' ORDER BY l.created_at DESC';

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error GET /api/leaves:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil data riwayat izin' });
        }
        res.json({ success: true, data: results });
    });
});

app.put('/api/leaves/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    const query = 'UPDATE leaves SET status = ? WHERE id = ?';
    db.query(query, [status, id], (err, result) => {
        if (err) {
            console.error('Error PUT /api/leaves/:id/status:', err);
            return res.status(500).json({ success: false, message: 'Gagal memperbarui status izin' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Pengajuan izin tidak ditemukan' });
        }
        res.json({ success: true, message: `Status izin berhasil diubah menjadi ${status}` });
    });
});

// GET dashboard user by NIP (include photo)
app.get('/api/users/dashboard/:nip', (req, res) => {
    const { nip } = req.params;

    db.query('SELECT id, nip, full_name, email, phone, photo FROM users WHERE nip = ?', [nip], (err, users) => {
        if (err || users.length === 0) {
            return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan' });
        }

        const user = users[0];

        db.query(
            `SELECT a.scan_time, a.status, u.nip, u.full_name 
             FROM attendances a 
             LEFT JOIN users u ON a.user_id = u.id 
             WHERE u.nip = ? 
             ORDER BY a.scan_time DESC LIMIT 10`,
            [nip],
            (err, attendances) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Gagal mengambil data absensi' });
                }
                res.json({
                    success: true,
                    data: {
                        user: user,
                        attendances: attendances || []
                    }
                });
            }
        );
    });
});

// ==========================================
// POST /api/users/register — DENGAN UPLOAD FOTO
// ==========================================
app.post('/api/users/register', upload.single('photo'), async (req, res) => {
    const { nip, full_name, email, phone, password } = req.body;

    if (!nip || !full_name || !email || !password) {
        return res.status(400).json({ success: false, message: 'NIP, Nama, Email, dan Password wajib diisi' });
    }

    try {
        db.query('SELECT id FROM users WHERE nip = ? OR email = ?', [nip, email], async (err, existing) => {
            if (err) {
                console.error('Error POST /api/users/register check:', err);
                return res.status(500).json({ success: false, message: 'Gagal mengecek data' });
            }

            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: 'NIP atau Email sudah terdaftar' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // Ambil path foto kalau ada
            const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

            const query = 'INSERT INTO users (nip, full_name, email, phone, photo, password) VALUES (?, ?, ?, ?, ?, ?)';
            db.query(query, [nip, full_name, email, phone || null, photoPath, hashedPassword], (err, result) => {
                if (err) {
                    console.error('Error POST /api/users/register insert:', err);
                    return res.status(500).json({ success: false, message: 'Gagal registrasi' });
                }
                res.status(201).json({
                    success: true,
                    message: 'Registrasi berhasil',
                    nip: nip,
                    photo: photoPath
                });
            });
        });
    } catch (err) {
        console.error('Error POST /api/users/register:', err);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem' });
    }
});

// ==========================================
// CREATE TABLE LEAVES
// ==========================================

const createLeavesTable = `
CREATE TABLE IF NOT EXISTS leaves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nip VARCHAR(50) NOT NULL,
    type ENUM('Sakit', 'Izin', 'Cuti') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    attachment VARCHAR(255) NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (nip) REFERENCES users(nip) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
`;

db.query(createLeavesTable, (err) => {
    if (err) {
        console.error('❌ Gagal membuat tabel leaves:', err.message);
    } else {
        console.log('✅ Tabel leaves siap digunakan');
    }
});

// ==========================================
// CREATE COLUMN PHOTO (kalau belum ada)
// ==========================================
const checkPhotoColumn = `
    SELECT COUNT(*) AS col_exists 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'photo'
`;

db.query(checkPhotoColumn, (err, results) => {
    if (err) {
        console.error('⚠️  Gagal cek kolom photo:', err.message);
        return;
    }

    if (results[0].col_exists === 0) {
        db.query('ALTER TABLE users ADD COLUMN photo VARCHAR(255) NULL AFTER phone', (err) => {
            if (err) {
                console.error('❌ Gagal menambah kolom photo:', err.message);
            } else {
                console.log('✅ Kolom "photo" berhasil ditambahkan ke tabel users');
            }
        });
    } else {
        console.log('✅ Kolom "photo" sudah ada di tabel users');
    }
});

const fs = require('fs');
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Folder "public/uploads" berhasil dibuat');
} else {
    console.log('📁 Folder "public/uploads" sudah ada');
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server absensi berjalan di http://localhost:${PORT}`);
    console.log(`📋 Endpoint tersedia:`);
    console.log(`   - GET  /api/users`);
    console.log(`   - GET  /api/users/:id`);
    console.log(`   - POST /api/users`);
    console.log(`   - PUT  /api/users/:id`);
    console.log(`   - PUT  /api/users/:id/photo`);
    console.log(`   - DELETE /api/users/:id`);
    console.log(`   - POST /api/attendance/scan`);
    console.log(`   - GET  /api/attendance`);
    console.log(`   - POST /api/leaves`);
    console.log(`   - GET  /api/leaves`);
    console.log(`   - PUT  /api/leaves/:id/status`);
    console.log(`   - GET  /api/users/dashboard/:nip`);
    console.log(`   - POST /api/users/register  (upload foto profil)`);
});