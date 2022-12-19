export const personStateColorProperty = (
  domain: string,
  state: string
): string => {
  switch (state) {
    case "home":
      return `--state-${domain}-home-color`;
    case "not_home":
      return `--state-${domain}-not_home-color`;
    default:
      return `--state-${domain}-zone-color`;
  }
};
