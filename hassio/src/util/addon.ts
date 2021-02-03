import memoizeOne from "memoize-one";
import { SupervisorArchs } from "../../../src/data/supervisor/supervisor";

export const addonArchIsSupported = memoizeOne(
  (supported_archs: SupervisorArchs[], addon_archs: SupervisorArchs[]) =>
    addon_archs.some((arch) => supported_archs.includes(arch))
);
