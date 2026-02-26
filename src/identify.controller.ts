import { Request, Response } from 'express';
import { identify } from './identify.service';

export async function identifyController(req: Request, res: Response) {
  const { email, phoneNumber } = req.body;

  // At least one of these needs to exist. We're not psychic.
  if (!email && !phoneNumber) {
    res.status(400).json({ error: 'Provide at least an email or phoneNumber.' });
    return;
  }

  try {
    const result = await identify({ email, phoneNumber });
    res.status(200).json(result);
  } catch (error) {
    console.error('Identity crisis:', error);
    res.status(500).json({ error: 'Something went wrong. The flux capacitor is acting up.' });
  }
}
