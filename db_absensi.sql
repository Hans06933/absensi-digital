SET FOREIGN_KEY_CHECKS = 0;

-- 1. Buat Tabel Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nip` varchar(255) DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Buat Tabel Attendances
CREATE TABLE IF NOT EXISTS `attendances` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `scan_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('Masuk','Pulang') DEFAULT 'Masuk',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Insert Data Users
INSERT INTO `users` (`id`, `nip`, `full_name`, `email`, `phone`, `password`, `created_at`, `updated_at`) VALUES
(1, '2311501486', 'Muhammad Farhan Syaakir', 'mfarhansyaakir@gmail.com', '08989868438', '123456', '2026-08-28 08:57:21', '2026-08-28 08:59:54'),
(2, '123456', 'aan baik hati', '2311501486@student.budiluhur.ac.id', '081317908079', '061204', '2026-08-28 09:10:30', '2026-08-28 09:10:30'),
(3, '061204', 'syaakir', 'syaakir@gmail.com', '085645342134', '1111', '2026-08-28 09:26:21', '2026-08-28 09:26:21'),
(4, '1234567890123456', 'farhan', 'saknjajs@gmail.com', '08989868438', 'Syarda_123', '2026-08-28 09:36:16', '2026-08-28 09:36:16')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- 4. Insert Data Attendances
INSERT INTO `attendances` (`id`, `user_id`, `scan_time`, `status`) VALUES
(1, 1, '2026-08-28 08:58:31', 'Masuk'),
(2, 1, '2026-08-28 09:00:19', 'Masuk'),
(3, 2, '2026-08-28 09:13:26', 'Masuk'),
(4, 3, '2026-08-28 09:37:21', 'Masuk')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

SET FOREIGN_KEY_CHECKS = 1;