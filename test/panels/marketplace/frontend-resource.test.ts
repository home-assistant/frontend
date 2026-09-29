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
    expect(generateFrontendResourceURL({ repository: repository({}) })).toBe(
      "/local/community/card/card.js"
    );
  });

  it("uses the repository name without a folder", () => {
    expect(
      generateFrontendResourceURL({
        repository: repository({ local_path: "" }),
      })
    ).toBe("/local/community/renamed-card/card.js");
  });
});
