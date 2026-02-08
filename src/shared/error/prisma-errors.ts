export const PrismaErrorCodes = {
  UNIQUE_CONSTRAINT: 'P2002',
  NOT_FOUND: 'P2025',
  FOREIGN_KEY_CONSTRAINT: 'P2003',
  REQUIRED_FIELD_MISSING: 'P2011',
  INVALID_VALUE: 'P2006',
  ALREADY_CONNECTED: 'P2018',
  TOO_MANY_CONNECTIONS: 'P1001',
  TIMEOUT: 'P1008',
} as const;

export type PrismaErrorCode = (typeof PrismaErrorCodes)[keyof typeof PrismaErrorCodes];
