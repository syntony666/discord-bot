/**
 * Prisma error codes
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference
 */
export const PrismaErrorCodes = {
  /** Unique constraint violation */
  UNIQUE_CONSTRAINT: 'P2002',

  /** Record not found (used in update/delete) */
  NOT_FOUND: 'P2025',

  /** Foreign key constraint violation */
  FOREIGN_KEY_CONSTRAINT: 'P2003',

  /** Required field missing */
  REQUIRED_FIELD_MISSING: 'P2011',

  /** Invalid value for field type */
  INVALID_VALUE: 'P2006',

  /** Record already connected (many-to-many) */
  ALREADY_CONNECTED: 'P2018',

  /** Too many database connections */
  TOO_MANY_CONNECTIONS: 'P1001',

  /** Database timeout */
  TIMEOUT: 'P1008',
} as const;

export type PrismaErrorCode = (typeof PrismaErrorCodes)[keyof typeof PrismaErrorCodes];
