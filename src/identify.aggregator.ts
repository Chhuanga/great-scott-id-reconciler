import { Contact, LinkPrecedence } from './generated/prisma';
import prisma from './db';
import { IdentifyResponse } from './identify.types';

// Crawls up the chain to find the root primary.
// If a secondary points to another secondary (edge case from merges), we keep going.
export async function findPrimaryContact(contact: Contact): Promise<Contact> {
  if (contact.linkPrecedence === LinkPrecedence.primary) {
    return contact;
  }

  const parent = await prisma.contact.findUnique({
    where: { id: contact.linkedId! },
  });

  if (!parent) {
    // Orphaned secondary? Shouldn't happen, but the universe is chaotic.
    return contact;
  }

  return findPrimaryContact(parent);
}

// Fetches the full identity cluster for a given primary and builds the spec-compliant response.
// Primary's identifiers always come first in the arrays — non-negotiable.
export async function buildResponse(primaryId: number): Promise<IdentifyResponse> {
  const cluster = await prisma.contact.findMany({
    where: {
      OR: [{ id: primaryId }, { linkedId: primaryId }],
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });

  const primary = cluster.find((c: Contact) => c.id === primaryId)!;

  const emails = [
    primary.email,
    ...cluster
      .filter((c: Contact) => c.id !== primaryId && c.email)
      .map((c: Contact) => c.email),
  ].filter((e): e is string => !!e);

  const phoneNumbers = [
    primary.phoneNumber,
    ...cluster
      .filter((c: Contact) => c.id !== primaryId && c.phoneNumber)
      .map((c: Contact) => c.phoneNumber),
  ].filter((p): p is string => !!p);

  return {
    contact: {
      primaryContactId: primaryId,
      emails: [...new Set(emails)],
      phoneNumbers: [...new Set(phoneNumbers)],
      secondaryContactIds: cluster
        .filter((c: Contact) => c.id !== primaryId)
        .map((c: Contact) => c.id),
    },
  };
}
