export interface Route {
  path: string;
  prefix: string;
}

export interface LovelaceResourcesMutableParams {
  resource_id?: number;
  res_type: "css" | "js" | "module" | "html";
  url: string;
}

export interface LocationChangedEvent {
  detail?: { route: Route; force?: boolean };
}

export enum HacsDispatchEvent {
  CONFIG = "hacs_dispatch_config",
  ERROR = "hacs_dispatch_error",
  RELOAD = "hacs_dispatch_reload",
  REPOSITORY = "hacs_dispatch_repository",
  STAGE = "hacs_dispatch_stage",
  STARTUP = "hacs_dispatch_startup",
  STATUS = "hacs_dispatch_status",
}
