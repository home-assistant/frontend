import { describe, expect, it } from "vitest";
import type { RepositoryBase } from "../../../src/data/marketplace/repository";
import {
  isCommunityOrganization,
  repositoryAuthors,
} from "../../../src/panels/marketplace/tools/authors";

const repository = (authors: string[] | undefined, fullName = "owner/repo") =>
  ({ authors, full_name: fullName }) as RepositoryBase;

describe("repositoryAuthors", () => {
  it("names the authors without their @", () => {
    expect(repositoryAuthors(repository(["@one", "two"]))).toEqual([
      "one",
      "two",
    ]);
  });

  it.each([[], undefined])(
    "names the owner without authors (%s)",
    (authors) => {
      expect(repositoryAuthors(repository(authors))).toEqual(["owner"]);
    }
  );
});

describe("isCommunityOrganization", () => {
  it.each([
    ["custom-cards", true],
    ["owner", false],
  ])("tells %s apart", (author, expected) => {
    expect(isCommunityOrganization(author)).toBe(expected);
  });
});
