import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented in Phase 2
router.get('/', (req, res) => {
  res.json({ success: true, data: { message: 'Department routes - coming soon' } });
});

export default router;
