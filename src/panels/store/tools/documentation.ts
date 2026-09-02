export const documentationUrl = (options?: { path?: string }) => {
  return `https://www.hacs.xyz${options?.path || ""}`;
};
