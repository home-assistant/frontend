export class GUISupportError extends Error {
  public warnings?: string[];

  public errors?: string[];

  constructor(message: string, warnings?: string[], errors?: string[]) {
    super(message);
    this.name = "GUISupportError";
    this.warnings = warnings;
    this.errors = errors;
  }
}
