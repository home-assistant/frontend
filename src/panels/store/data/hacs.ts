import type { RepositoryBase, RepositoryType } from "./repository";

export const APP_FULL_NAME = "Home Assistant Community Store";

export interface HacsInfo {
  categories: RepositoryType[];
  country: string;
  debug: boolean;
  dev: boolean;
  disabled_reason: string;
  lovelace_mode: "storage" | "yaml" | "auto-gen";
  stage: "startup" | "waiting" | "running" | "setup";
  startup: boolean;
  version: string;
}

export interface Hacs {
  language: string;
  repositories: RepositoryBase[];
  info: HacsInfo;
  log: any;
}
