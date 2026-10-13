import type { ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { registriesContext, statesContext } from "../../data/context";
import { isSecurityPanelEntity } from "./strategies/security-view-strategy";

export type SecurityEntityContext = ContextType<typeof registriesContext> & {
  states: ContextType<typeof statesContext>;
};

export const createSecurityEntityFilter =
  (getContext: () => SecurityEntityContext | undefined) =>
  (entity: HassEntity): boolean => {
    const context = getContext();
    return context ? isSecurityPanelEntity(context, entity) : false;
  };
