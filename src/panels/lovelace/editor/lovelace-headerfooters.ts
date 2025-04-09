import type { HeaderFooter } from "./types";

import {
  mdiChartBellCurveCumulative,
  mdiGestureTapButton,
  mdiImageArea,
} from "@mdi/js";

export const headerFooterElements: HeaderFooter[] = [
  { type: "graph", icon: mdiChartBellCurveCumulative },
  { type: "buttons", icon: mdiGestureTapButton },
  { type: "picture", icon: mdiImageArea },
];
