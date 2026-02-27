export interface ValidatedInput {
  email: string | null;
  phoneNumber: string | null;
}

export interface ValidationError {
  valid: false;
  message: string;
}

export interface ValidationSuccess {
  valid: true;
  data: ValidatedInput;
}

// Whittle the raw request body down to something safe and predictable.
export function validateIdentifyBody(body: unknown): ValidationError | ValidationSuccess {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Request body must be a JSON object.' };
  }

  const { email, phoneNumber } = body as Record<string, unknown>;

  // Coerce empty strings to null — we treat "" the same as "not provided".
  const cleanEmail = typeof email === 'string' && email.trim() ? email.trim() : null;
  const cleanPhone = typeof phoneNumber === 'string' && phoneNumber.trim() ? phoneNumber.trim() : null;

  if (!cleanEmail && !cleanPhone) {
    return { valid: false, message: 'At least one of email or phoneNumber must be provided.' };
  }

  // Basic email sanity check. Not RFC 5322 compliant, but good enough for a flux capacitor purchase.
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { valid: false, message: `"${cleanEmail}" does not look like a valid email address.` };
  }

  if (cleanPhone && cleanPhone.length < 10) {
    return { valid: false, message: 'Phone number must be at least 10 digits long.' };
  }

  return { valid: true, data: { email: cleanEmail, phoneNumber: cleanPhone } };
}
