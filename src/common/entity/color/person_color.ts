export const personColor = (state: string): string | undefined => {
  switch (state) {
    case "home":
      return "person-home";
    default:
      return "person-zone";
  }
};
