// ===========================
// SECTION | IMPORTS
// ===========================
import { Request, Response, Router } from 'express';
// =========================== !SECTION

// ===========================
// SECTION | INIT
// ===========================
const root = Router();
// =========================== !SECTION

// ===========================
// SECTION | MAIN
// ===========================
root.get('/', async (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
  });
});

// -> Export
export default root;
// =========================== !SECTION
