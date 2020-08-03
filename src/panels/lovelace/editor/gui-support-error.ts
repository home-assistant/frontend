export class GUISupportError extends Error {
  public warnings?: string[] = [];

  constructor(message: string, warnings?: string[]) {
    super(message);
    this.name = "GUISupportError";
    this.warnings = warnings;
  }
}
