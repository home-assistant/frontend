import memoizeOne from "memoize-one";
import { SupervisorArch } from "../../../src/data/supervisor/supervisor";

export const addonArchIsSupported = memoizeOne(
  (supported_archs: SupervisorArch[], addon_archs: SupervisorArch[]) =>
    addon_archs.some((arch) => supported_archs.includes(arch))
);
