import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented
router.get('/', (req, res) => {
  res.json({ success: true, data: { message: 'User routes - coming soon' } });
});

export default router;
