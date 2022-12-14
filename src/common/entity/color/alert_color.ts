export const alertColor = (state?: string): string | undefined => {
  switch (state) {
    case "on":
      return "alert";
    case "off":
      return "alert-off";
    default:
      return undefined;
  }
};
