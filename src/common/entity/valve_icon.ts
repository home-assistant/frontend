/** Return an icon representing a cover state. */
import { mdiValve, mdiValveClosed, mdiValveOpen } from "@mdi/js";

export const valveIcon = (state?: string): string => {
  switch (state) {
    case "opening":
    case "closing":
      return mdiValve;
    case "closed":
      return mdiValveClosed;
    default:
      return mdiValveOpen;
  }
};
