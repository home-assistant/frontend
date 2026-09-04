import type { ConnectivityFixtures } from "../types";

// The tag panel's commands are mocked in ../../tags, which the config panel
// stubs register. Listing the prefix here loads that chunk for the write
// commands too, not just the `tag/list` the panel starts with.
export const tagsFixtures: ConnectivityFixtures = {
  components: ["tag"],
  commands: ["tag/"],
};
