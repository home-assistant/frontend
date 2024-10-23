import {
  mdiChartBellCurveCumulative,
  mdiGestureTapButton,
  mdiImageArea,
} from "@mdi/js";
import type { HeaderFooter } from "./types";

export const headerFooterElements: HeaderFooter[] = [
  { type: "graph", icon: mdiChartBellCurveCumulative },
  { type: "buttons", icon: mdiGestureTapButton },
  { type: "picture", icon: mdiImageArea },
];
