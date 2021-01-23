import { StructError } from "superstruct";

export const handleStructError = (err: Error): string[] => {
  if (!(err instanceof StructError)) {
    return [err.message];
  }
  const errors: string[] = [];
  for (const failure of err.failures()) {
    if (failure.type === "never") {
      errors.push(
        `Key "${failure.path.join(".")}" is not supported by the UI editor.`
      );
    } else {
      errors.push(
        `The provided value for "${failure.path.join(
          "."
        )}" is not supported by the UI editor. We support (${
          failure.type
        }) but received ${
          failure.value ? "(" + JSON.stringify(failure.value) + ")" : "no value"
        }.`
      );
    }
  }
  return errors;
};
