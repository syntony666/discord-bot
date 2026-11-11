'use strict';

// Prisma config used inside the release package by tools/release-db.cjs.
// Only DATABASE_URL is read, from the environment provided by systemd.
module.exports = {
  schema: '../prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
