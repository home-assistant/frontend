import { HomeAssistant } from "../types";
import { SignedPath } from "./types";

export const getSignedPath = (
  hass: HomeAssistant,
  path: string
): Promise<SignedPath> => hass.callWS({ type: "auth/sign_path", path });
