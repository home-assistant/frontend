import { describe, expect, it } from "vitest";
import type { RepositoryBase } from "../../../src/data/marketplace/repository";
import { generateFrontendResourceURL } from "../../../src/panels/marketplace/tools/frontend-resource";

const repository = (extra: Partial<RepositoryBase>) =>
  ({
    full_name: "owner/renamed-card",
    file_name: "card.js",
    local_path: "/config/www/community/card",
    ...extra,
  }) as RepositoryBase;

describe("generateFrontendResourceURL", () => {
  it("points at the folder the card is in, also after a rename", () => {
    expect(
      generateFrontendResourceURL({
        repository: repository({}),
        version: "1.0.0",
      })
    ).toBe("/local/community/card/card.js?v=1.0.0");
  });

  it("uses the repository name without a folder", () => {
    expect(
      generateFrontendResourceURL({
        repository: repository({ local_path: "" }),
        version: "1.0.0",
      })
    ).toBe("/local/community/renamed-card/card.js?v=1.0.0");
  });

  it("encodes what goes into the address", () => {
    expect(
      generateFrontendResourceURL({
        repository: repository({
          local_path: "/config/www/community/my card",
          file_name: "card #1.js",
        }),
        version: "v1.0 beta",
      })
    ).toBe("/local/community/my%20card/card%20%231.js?v=v1.0%20beta");
  });
});
