import { Router } from 'express';
import { handleDatabaseError } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireOwner } from '../middleware/auth.js';
import { createGroupSchema } from '../schemas/index.js';
import { createGroup } from '../services/groupService.js';
import { listInvitableMembers } from '../services/contactService.js';

const router = Router();

router.post('/', requireOwner, validate(createGroupSchema), async (req, res) => {
  try {
    const members = await listInvitableMembers(req.user.id);
    const nameMap = Object.fromEntries(members.map((m) => [m.id, m.nama]));

    const group = await createGroup(req.user.id, req.validatedData, nameMap);
    res.status(201).json({ group });
  } catch (err) {
    console.error('[GROUP CREATE]', err);
    if (err.code) return handleDatabaseError(err, res);
    res.status(500).json({ error: 'Terjadi kesalahan sistem' });
  }
});

export default router;
