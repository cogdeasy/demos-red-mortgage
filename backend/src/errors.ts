export class ConflictError extends Error {
  public readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
