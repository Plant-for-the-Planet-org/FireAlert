"use strict";
const { PrismaClient } = require("@prisma/client");

// Dynamically import the ES Module
const envPromise = import("../src/env.mjs");

let prismaGlobal;

// Asynchronously create and configure the PrismaClient instance
async function createPrismaClient() {
    const env = await envPromise; // Await the resolved module
    const prisma = new PrismaClient({
        log: env.NODE_ENV === 'development' ? ['error'] : ['error'],
    });

    if (env.NODE_ENV !== 'production') {
        prismaGlobal = prisma;
    }

    return prisma;
}

// Export a promise that resolves to the PrismaClient instance
exports.prisma = createPrismaClient();

// If you need to access the global prisma instance elsewhere
exports.getGlobalPrisma = () => prismaGlobal;
