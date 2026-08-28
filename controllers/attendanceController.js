const db = require('../config/db');

exports.scanQr = async (req, res) => {
    const { qr_payload } = req.body;

    if (!qr_payload) {
        return res.status(400).json({ success: false, message: 'QR Code tidak valid' });
    }

    try {
        // Cari pegawai berdasarkan NIP dari QR Code
        const [users] = await db.query('SELECT id, full_name FROM users WHERE nip = ?', [qr_payload]);
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Pegawai tidak terdaftar!' });
        }

        const user = users[0];

        // Simpan data absensi
        await db.query('INSERT INTO attendances (user_id, status) VALUES (?, ?)', [user.id, 'Masuk']);

        res.json({
            success: true,
            message: `Absensi berhasil! Selamat datang, ${user.full_name}`,
            status: 'Masuk'
        });
    } catch (error) {
        console.error('Error scanQr:', error);
        res.status(500).json({ success: false, message: 'Gagal mencatat absensi' });
    }
};