import { Request, Response } from 'express';
import { identify } from './identify.service';
import { validateIdentifyBody } from './identify.validator';

export async function identifyController(req: Request, res: Response) {
  const validation = validateIdentifyBody(req.body);

  if (!validation.valid) {
    res.status(400).json({ error: validation.message });
    return;
  }

  try {
    const result = await identify(validation.data);
    res.status(200).json(result);
  } catch (error) {
    console.error('Identity crisis:', error);
    res.status(500).json({ error: 'Something went wrong. The flux capacitor is acting up.' });
  }
}
