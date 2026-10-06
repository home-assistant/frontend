import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import en from "../../../src/translations/en.json";

type TranslationNode = string | { [key: string]: TranslationNode };

// The English strings as users see them, quotes and plurals included
const format = (key: string, values: Record<string, string | number>) => {
  const message = `ui.panel.marketplace.${key}`
    .split(".")
    .reduce<TranslationNode | undefined>(
      (translations, part) =>
        typeof translations === "object" ? translations[part] : undefined,
      en as TranslationNode
    );
  return new IntlMessageFormat(message as string, "en").format(values);
};

describe("Marketplace strings", () => {
  it("names the repository to add", () => {
    expect(
      format("my.add_repository_description", {
        repository: "owner/card",
      })
    ).toBe("Add the custom repository owner/card to the Marketplace?");
  });

  it.each([
    ["warning.continue_in", { seconds: 1 }, "You can continue in 1 second"],
    ["warning.continue_in", { seconds: 2 }, "You can continue in 2 seconds"],
    [
      "repository.community.downloads",
      { number: 1, count: "1" },
      "Downloaded 1 time",
    ],
    [
      "repository.community.downloads",
      { number: 1200, count: "1,200" },
      "Downloaded 1,200 times",
    ],
    [
      "repository.community.stars",
      { number: 1, count: "1" },
      "1 star on GitHub",
    ],
    [
      "repository.community.open_issues",
      { number: 1, count: "1" },
      "1 open issue on GitHub",
    ],
  ])("formats %s with %o", (key, values, expected) => {
    expect(format(key, values)).toBe(expected);
  });
});
