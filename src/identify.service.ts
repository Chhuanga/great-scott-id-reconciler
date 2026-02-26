import { Contact, LinkPrecedence, Prisma } from './generated/prisma';
import prisma from './db';

export interface IdentifyRequest {
  email?: string | null;
  phoneNumber?: string | null;
}

export interface IdentifyResponse {
  contact: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

// Crawls up the chain to find the root primary.
// If a secondary points to another secondary (edge case from merges), we keep going.
async function findPrimaryContact(contact: Contact): Promise<Contact> {
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

// Builds the final response by gathering the full identity cluster.
async function buildResponse(primaryId: number): Promise<IdentifyResponse> {
  const cluster = await prisma.contact.findMany({
    where: {
      OR: [{ id: primaryId }, { linkedId: primaryId }],
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });

  const primary = cluster.find((c: Contact) => c.id === primaryId)!;

  // Primary's email and phone go first — house rules.
  const emails = [
    primary.email,
    ...cluster.filter((c: Contact) => c.id !== primaryId && c.email).map((c: Contact) => c.email),
  ].filter((e): e is string => !!e);

  const phoneNumbers = [
    primary.phoneNumber,
    ...cluster
      .filter((c: Contact) => c.id !== primaryId && c.phoneNumber)
      .map((c: Contact) => c.phoneNumber),
  ].filter((p): p is string => !!p);

  // De-duplicate while preserving order (Set is chronological in JS, thankfully).
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

export async function identify(req: IdentifyRequest): Promise<IdentifyResponse> {
  const { email, phoneNumber } = req;

  // Wrap everything in a transaction. Two Docs can't buy the same flux capacitor at the same time.
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {

    // Step 1: Find everyone who matches either identifier.
    const orClauses: Prisma.ContactWhereInput[] = [];
    if (email) orClauses.push({ email });
    if (phoneNumber) orClauses.push({ phoneNumber });

    const matches = await tx.contact.findMany({
      where: { OR: orClauses, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    // Scenario 1: No matches at all — Doc is new here.
    if (matches.length === 0) {
      const newContact = await tx.contact.create({
        data: {
          email: email ?? null,
          phoneNumber: phoneNumber ?? null,
          linkPrecedence: LinkPrecedence.primary,
          linkedId: null,
        },
      });

      return buildResponse(newContact.id);
    }

    // Find the root primaries for all matched contacts.
    const primaries = await Promise.all(
      matches.map((m: Contact) => findPrimaryContact(m))
    );

    // De-duplicate primaries by ID.
    const uniquePrimaries = [...new Map(primaries.map((p) => [p.id, p])).values()];
    uniquePrimaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const oldestPrimary = uniquePrimaries[0];

    // Scenario 3: Two separate primary chains just collided — merge time.
    // The older one survives. The younger one gets demoted. Sorry, not sorry.
    if (uniquePrimaries.length > 1) {
      const primaryIdsToMerge = uniquePrimaries.slice(1).map((p) => p.id);

      await tx.contact.updateMany({
        where: {
          OR: [
            { id: { in: primaryIdsToMerge } },
            { linkedId: { in: primaryIdsToMerge } },
          ],
        },
        data: {
          linkPrecedence: LinkPrecedence.secondary,
          linkedId: oldestPrimary.id,
          updatedAt: new Date(),
        },
      });
    }

    // Scenario 2: Known primary, but the request has new info we haven't seen.
    // Create a secondary to log this new contact point.
    const isNewEmail = email && !matches.some((m: Contact) => m.email === email);
    const isNewPhone = phoneNumber && !matches.some((m: Contact) => m.phoneNumber === phoneNumber);

    if (isNewEmail || isNewPhone) {
      await tx.contact.create({
        data: {
          email: email ?? null,
          phoneNumber: phoneNumber ?? null,
          linkedId: oldestPrimary.id,
          linkPrecedence: LinkPrecedence.secondary,
        },
      });
    }

    return buildResponse(oldestPrimary.id);
  });
}
