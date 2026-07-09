export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'ACCOUNT_NOT_ACTIVE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DUPLICATA_POSSIVEL'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  ACCOUNT_NOT_ACTIVE: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  DUPLICATA_POSSIVEL: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fields = fields;
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new AppError('VALIDATION_ERROR', message, fields);
export const unauthorized = (message = 'Não autenticado.') =>
  new AppError('UNAUTHENTICATED', message);
export const forbidden = (message = 'Acesso negado.') => new AppError('FORBIDDEN', message);
export const notFound = (message = 'Recurso não encontrado.') =>
  new AppError('NOT_FOUND', message);
export const conflict = (message: string, fields?: Record<string, string>) =>
  new AppError('CONFLICT', message, fields);
export const duplicataPossivel = (message: string) =>
  new AppError('DUPLICATA_POSSIVEL', message);
