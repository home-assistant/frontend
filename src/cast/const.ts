import { CAST_DEV_APP_ID } from "./dev_const";

// Guard dev mode with `__dev__` so it can only ever be enabled in dev mode.
export const CAST_DEV = __DEV__ && true;

export const CAST_APP_ID = CAST_DEV ? CAST_DEV_APP_ID : "A078F6B0";
export const CAST_NS = "urn:x-cast:com.nabucasa.hast";
