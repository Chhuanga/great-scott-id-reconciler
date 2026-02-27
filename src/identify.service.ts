import { Contact, LinkPrecedence, Prisma } from '../generated/prisma';
import prisma from './db';
import { buildResponse, findPrimaryContact } from './identify.aggregator';
import { IdentifyRequest, IdentifyResponse } from './identify.types';

export async function identify(req: IdentifyRequest): Promise<IdentifyResponse> {
  const { email, phoneNumber } = req;

  // The transaction only decides what to write and returns the primaryId.
  // buildResponse runs AFTER the transaction commits so it reads clean, settled data.
  // Two Docs still can't buy the same flux capacitor at the same time.
  const primaryId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {

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

      return newContact.id;
    }

    // Find the root primaries for all matched contacts.
    const primaries = await Promise.all(
      matches.map((m: Contact) => findPrimaryContact(m))
    );

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

    return oldestPrimary.id;
  });

  // Transaction committed — all writes are now visible. Safe to aggregate.
  return buildResponse(primaryId);
}
