// Prisma config used inside the release package by scripts/db/cli.js.
// Only DATABASE_URL is read, from the environment provided by systemd.
export default {
  schema: '../../prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
