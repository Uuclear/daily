export function badRequest(message: string, details?: any) {
  return { status: 400, body: { error: 'BadRequest', message, details } };
}

export function unauthorized(message: string = 'Unauthorized') {
  return { status: 401, body: { error: 'Unauthorized', message } };
}

export function forbidden(message: string = 'Forbidden') {
  return { status: 403, body: { error: 'Forbidden', message } };
}

export function notFound(message: string = 'Not found') {
  return { status: 404, body: { error: 'NotFound', message } };
}

export function conflict(message: string, details?: any) {
  return { status: 409, body: { error: 'Conflict', message, details } };
}

export function internalError(message: string = 'Internal server error') {
  return { status: 500, body: { error: 'InternalError', message } };
}
