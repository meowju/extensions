import { Router } from 'express';
import { getAllUsers, getUserById } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllUsers);
router.get('/:id', getUserById);

export default router;