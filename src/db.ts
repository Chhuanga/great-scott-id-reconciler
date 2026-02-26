import { PrismaClient } from './generated/prisma';

// One instance to rule them all. Prisma handles the connection pool.
const prisma = new PrismaClient();

export default prisma;
