const db = require('../config/db');

exports.getUserDashboard = async (req, res) => {
    const { nip } = req.params;

    if (!nip) {
        return res.status(400).json({ 
            success: false, 
            message: 'NIP wajib disertakan' 
        });
    }

    try {
        // 1. Ambil profil pegawai berdasarkan NIP
        const [users] = await db.query(
            'SELECT id, nip, full_name, email, phone, created_at FROM users WHERE nip = ?', 
            [nip]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Data pegawai tidak ditemukan' 
            });
        }

        const user = users[0];

        // 2. Ambil riwayat absensi pegawai tersebut
        const [attendances] = await db.query(
            'SELECT id, scan_time, status FROM attendances WHERE user_id = ? ORDER BY scan_time DESC LIMIT 10',
            [user.id]
        );

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
                attendances
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