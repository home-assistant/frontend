import { StructError } from "superstruct";

export const handleStructError = (err: Error): string[] => {
  if (err instanceof StructError) {
    const errors: string[] = [];
    for (const failure of err.failures()) {
      if (failure.type === "never") {
        errors.push(
          `Key "${failure.path[0]}" is not supported by the UI editor.`
        );
      } else {
        errors.push(
          `The value of "${failure.path.join(
            "."
          )}" is not supported by the UI editor, we support "${
            failure.type
          }" but received "${JSON.stringify(failure.value)}".`
        );
      }
    }
    return errors;
  }
  return [err.message];
};
