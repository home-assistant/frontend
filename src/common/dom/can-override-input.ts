export const canOverrideAlphanumericInput = (composedPath: EventTarget[]) => {
  if (
    composedPath.some(
      (el) =>
        "tagName" in el &&
        (el.tagName === "HA-MENU" || el.tagName === "HA-CODE-EDITOR")
    )
  ) {
    return false;
  }

  const el = composedPath[0] as Element;

  if (el.tagName === "TEXTAREA") {
    return false;
  }

  if (el.parentElement?.tagName === "HA-SELECT") {
    return false;
  }

  if (el.tagName !== "INPUT") {
    return true;
  }

  switch ((el as HTMLInputElement).type) {
    case "button":
    case "checkbox":
    case "hidden":
    case "radio":
    case "range":
      return true;
    default:
      return false;
  }
};
