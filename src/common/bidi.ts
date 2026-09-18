export function bidiIsolate(value: string): string;
export function bidiIsolate(value: undefined): undefined;
export function bidiIsolate(value: string | undefined): string | undefined {
  return value === undefined ? undefined : `\u2068${value}\u2069`;
}
