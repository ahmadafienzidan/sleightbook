export type THttpErrorStatus = 400 | 404;

export class HttpError extends Error {
  readonly status: THttpErrorStatus;
  readonly code: string;

  constructor(status: THttpErrorStatus, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export const notFound = (entity: string): HttpError =>
  new HttpError(404, "NOT_FOUND", `${entity} not found`);
