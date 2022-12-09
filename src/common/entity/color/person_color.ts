export const personColor = (state: string): string | undefined => {
  switch (state) {
    case "home":
      return "person-home";
    case "not_home":
      return "person-not-home";
    default:
      return "person-zone";
  }
};
