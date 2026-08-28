const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userDashboardController = require('../controllers/userDashboardController');

// Route Dashboard User (Dipanggil berdasarkan NIP)
router.get('/dashboard/:nip', userDashboardController.getUserDashboard);

router.post('/register', userController.registerUser);

// Route CRUD Standard Pegawai
router.route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);

router.route('/:id')
    .get(userController.getUserById)
    .put(userController.updateUser)
    .delete(userController.deleteUser);

module.exports = router;