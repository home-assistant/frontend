import type { Route } from "../types";

export const computeRouteTail = (route: Route) => {
  const dividerPos = route.path.indexOf("/", 1);
  return dividerPos === -1
    ? {
        prefix: route.prefix + route.path,
        path: "",
      }
    : {
        prefix: route.prefix + route.path.substr(0, dividerPos),
        path: route.path.substr(dividerPos),
      };
};
