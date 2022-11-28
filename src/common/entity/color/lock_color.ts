export const lockColor = (state?: string): string | undefined => {
  switch (state) {
    case "locked":
      return "lock-locked";
    case "jammed":
      return "lock-jammed";
    case "locking":
    case "unlocking":
      return "lock-pending";
    default:
      return undefined;
  }
};
