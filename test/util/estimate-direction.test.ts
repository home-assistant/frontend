import { assert, describe, it } from "vitest";
import { estimateDirection } from "../../src/common/util/estimate-direction";

describe("Estimate direction tests", () => {
  const fixtures = [
    { input: "0", output: "neutral" },
    { input: "123", output: "neutral" },
    { input: "a", output: "ltr" },
    { input: "א", output: "rtl" },
    { input: "\u0000", output: "neutral" },
    { input: " ", output: "neutral" },
    { input: "!", output: "neutral" },
    { input: "@", output: "neutral" },
    { input: "[", output: "neutral" },
    { input: "`", output: "neutral" },
    { input: "A", output: "ltr" },
    { input: "english", output: "ltr" },
    { input: "sentence", output: "ltr" },
    { input: "Un", output: "ltr" },
    { input: "simple", output: "ltr" },
    { input: "anglais", output: "ltr" },
    { input: "phrase", output: "ltr" },
    { input: "שלום", output: "rtl" },
    { input: "אנגלית ENGLISH", output: "rtl" },
    { input: "أ", output: "rtl" },
    { input: "الجملة", output: "rtl" },
    { input: "الانجليزية", output: "rtl" },
    { input: "بسيطة", output: "rtl" },
  ];

  it("classifies direction for text inputs", () => {
    // @ts-expect-error missing argument.
    assert.strictEqual(estimateDirection(), "neutral");

    for (const { input, output } of fixtures) {
      assert.strictEqual(
        estimateDirection(input),
        output,
        `should classify '${input}' as '${output}'`
      );
    }
  });
});
