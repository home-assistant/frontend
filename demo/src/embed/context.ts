import { createContext } from "@lit/context";
import type { HomeAssistant } from "../../../src/types";

export const embedHassContext = createContext<HomeAssistant>("embedHass");
