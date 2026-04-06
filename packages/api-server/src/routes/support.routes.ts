import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented in Phase 5
router.get('/', (req, res) => {
  res.json({ success: true, data: { message: 'Support routes - coming soon' } });
});

export default router;
