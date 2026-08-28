const mysql = require('mysql2/promise');
require('dotenv').config();

// Konfigurasi koneksi MySQL Lokal (XAMPP)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_absensi',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Tes Koneksi Otomatis saat server dijalankan
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Berhasil terhubung ke Database MySQL Lokal!');
        connection.release();
    } catch (err) {
        console.error('❌ Gagal terhubung ke Database Lokal:', err.message);
    }
})();

module.exports = pool;