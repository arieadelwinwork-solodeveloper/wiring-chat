import { Router } from 'express';
import { handleDatabaseError } from '../lib/errors.js';
import { validate, validateParams } from '../middleware/validate.js';
import { createContactSchema, nomorIdLookupParamSchema } from '../schemas/index.js';
import {
  listContacts,
  listInvitableMembers,
  createContact,
  lookupUserByNomorId,
} from '../services/contactService.js';

const router = Router();

router.get('/lookup/:nomorId', validateParams(nomorIdLookupParamSchema), async (req, res) => {
  try {
    const user = await lookupUserByNomorId(req.validatedParams.nomorId, req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna dengan ID tersebut tidak ditemukan' });
    }
    res.json({ user });
  } catch (err) {
    console.error('[CONTACT LOOKUP]', err);
    if (err.code) return handleDatabaseError(err, res);
    res.status(500).json({ error: 'Terjadi kesalahan sistem' });
  }
});

router.get('/', async (req, res) => {
  try {
    const contacts = await listContacts(req.user.id);
    res.json({ contacts });
  } catch (err) {
    console.error('[CONTACTS LIST]', err);
    if (err.code) return handleDatabaseError(err, res);
    res.status(500).json({ error: 'Terjadi kesalahan sistem' });
  }
});

router.get('/invitable', async (req, res) => {
  try {
    const members = await listInvitableMembers(req.user.id);
    res.json({ members });
  } catch (err) {
    console.error('[INVITABLE]', err);
    res.status(500).json({ error: 'Terjadi kesalahan sistem' });
  }
});

router.post('/', validate(createContactSchema), async (req, res) => {
  try {
    const contact = await createContact(req.user.id, req.validatedData);
    res.status(201).json({ contact });
  } catch (err) {
    console.error('[CONTACT CREATE]', err);
    if (err.code) return handleDatabaseError(err, res);
    res.status(500).json({ error: 'Terjadi kesalahan sistem' });
  }
});

export default router;
