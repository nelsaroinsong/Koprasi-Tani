let PrismaClientClass: any;

try {
  if (typeof require !== 'undefined' && require.cache) {
    Object.keys(require.cache).forEach((key) => {
      if (key.includes('.prisma') || key.includes('@prisma')) {
        delete require.cache[key];
      }
    });
    PrismaClientClass = require('@prisma/client').PrismaClient;
  }
} catch (e) {
  // fallback
}

import { PrismaClient } from '@prisma/client';
const ResolvedClient = PrismaClientClass || PrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined;
};

export const prisma: PrismaClient =
  (globalForPrisma.prisma && globalForPrisma.prisma.review
    ? globalForPrisma.prisma
    : new ResolvedClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      })) as PrismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

