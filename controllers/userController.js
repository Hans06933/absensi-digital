const db = require('../config/db');

// Register Pegawai Baru (Pendaftaran Mandiri)
exports.registerUser = async (req, res) => {
    const { nip, full_name, email, phone, password } = req.body;

    if (!nip || !full_name || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'NIP, Nama Lengkap, Email, dan Password wajib diisi!' 
        });
    }

    try {
        // Cek apakah NIP atau Email sudah digunakan
        const [existing] = await db.query('SELECT id FROM users WHERE nip = ? OR email = ?', [nip, email]);
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'NIP atau Email sudah terdaftar!' 
            });
        }

        // Simpan data pegawai baru
        await db.query(
            'INSERT INTO users (nip, full_name, email, phone, password) VALUES (?, ?, ?, ?, ?)',
            [nip, full_name, email, phone || null, password]
        );

        res.status(201).json({
            success: true,
            message: 'Pendaftaran berhasil! Silakan masuk ke dashboard.',
            nip: nip
        });
    } catch (error) {
        console.error('Error register:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan sistem saat pendaftaran.' 
        });
    }
};

// Get All Users (Untuk Admin)
exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM users ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error getAllUsers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data pegawai' 
        });
    }
};

// Get User By ID
exports.getUserById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Pegawai tidak ditemukan' 
            });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil detail pegawai' 
        });
    }
};

// Create User (Manual dari Admin)
exports.createUser = async (req, res) => {
    const { nip, full_name, email, phone, password } = req.body;

    if (!nip || !full_name || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'NIP, Nama, Email, dan Password wajib diisi' 
        });
    }

    try {
        const [existing] = await db.query('SELECT id FROM users WHERE nip = ? OR email = ?', [nip, email]);
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'NIP atau Email sudah terdaftar' 
            });
        }

        const [result] = await db.query(
            'INSERT INTO users (nip, full_name, email, phone, password) VALUES (?, ?, ?, ?, ?)',
            [nip, full_name, email, phone || null, password]
        );

        res.status(201).json({
            success: true,
            message: 'Pegawai berhasil ditambahkan',
            data: { id: result.insertId, nip, full_name, email, phone }
        });
    } catch (error) {
        console.error('MySQL Insert Error:', error);
        res.status(500).json({ 
            success: false, 
            message: `Gagal database: ${error.message}` 
        });
    }
};

// Update User
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { nip, full_name, email, phone, password } = req.body;

    try {
        let query = 'UPDATE users SET nip = ?, full_name = ?, email = ?, phone = ? WHERE id = ?';
        let params = [nip, full_name, email, phone || null, id];

        if (password && password.trim() !== '') {
            query = 'UPDATE users SET nip = ?, full_name = ?, email = ?, phone = ?, password = ? WHERE id = ?';
            params = [nip, full_name, email, phone || null, password, id];
        }

        await db.query(query, params);
        res.json({ success: true, message: 'Data pegawai berhasil diperbarui' });
    } catch (error) {
        console.error('MySQL Update Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal memperbarui data pegawai' 
        });
    }
};

// Delete User
exports.deleteUser = async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Pegawai berhasil dihapus' });
    } catch (error) {
        console.error('MySQL Delete Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menghapus pegawai' 
        });
    }
};

// Get User Dashboard by NIP (Untuk Halaman User)
exports.getUserDashboard = async (req, res) => {
    try {
        const { nip } = req.params;
        
        // 1. Cek apakah user dengan NIP tersebut ada
        const [userRows] = await db.query('SELECT id, nip, full_name, email, phone FROM users WHERE nip = ?', [nip]);
        
        if (userRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Pegawai dengan NIP tersebut tidak ditemukan' 
            });
        }
        
        const user = userRows[0];
        
        // 2. Ambil riwayat absensi dari tabel attendances
        const [attendances] = await db.query(
            'SELECT id, scan_time, status FROM attendances WHERE user_id = ? ORDER BY scan_time DESC LIMIT 10', 
            [user.id]
        );
        
        // 3. Kirim response dengan data user dan riwayat absensi
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    nip: user.nip,
                    full_name: user.full_name,
                    email: user.email,
                    phone: user.phone
                },
                attendances: attendances
            }
        });
        
    } catch (error) {
        console.error('Error getUserDashboard:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data dashboard user' 
        });
    }
};