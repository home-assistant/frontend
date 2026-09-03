import { configEntry } from "../helpers";
import type { ConnectivityFixtures } from "../types";

const THREAD_ENTRY_ID = "mock-thread";
const OTBR_ENTRY_ID = "mock-otbr";

export const threadFixtures: ConnectivityFixtures = {
  components: ["thread", "otbr"],
  commands: ["thread/", "otbr/"],
  configEntries: [
    {
      type: "service",
      entry: configEntry(THREAD_ENTRY_ID, "thread", "Thread"),
    },
    {
      type: "service",
      entry: configEntry(OTBR_ENTRY_ID, "otbr", "Open Thread Border Router"),
    },
  ],
};
