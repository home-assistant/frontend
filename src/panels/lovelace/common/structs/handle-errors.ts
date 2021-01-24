import { StructError } from "superstruct";

export const handleStructError = (
  err: Error
): { warnings: string[]; errors?: string[] } => {
  if (!(err instanceof StructError)) {
    return { warnings: [err.message], errors: undefined };
  }
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const failure of err.failures()) {
    if (failure.value === undefined) {
      errors.push(`Required key "${failure.path.join(".")}" is missing.`);
    } else if (failure.type === "never") {
      warnings.push(
        `Key "${failure.path.join(
          "."
        )}" is not expected or not supported by the UI editor.`
      );
    } else {
      warnings.push(
        `The value of "${failure.path.join(
          "."
        )}" is not supported by the UI editor, we support "${
          failure.type
        }" but received "${JSON.stringify(failure.value)}".`
      );
    }
  }
  return { warnings, errors };
};
