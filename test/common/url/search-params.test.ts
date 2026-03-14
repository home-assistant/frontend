import { describe, expect, it, vi, afterEach } from "vitest";

import {
  addSearchParam,
  createSearchParam,
  extractSearchParam,
  extractSearchParamsObject,
  removeSearchParam,
} from "../../../src/common/url/search-params";

const sortQueryString = (querystring: string): string =>
  querystring.split("&").sort().join("&");

vi.mock("../../../src/common/dom/get_main_window", () => ({
  mainWindow: { location: { search: "?param1=ab+c&param2" } },
}));

afterEach(() => {
  vi.resetAllMocks();
});

describe("Search Params Tests", () => {
  it("should extract all search params from window object", () => {
    expect(extractSearchParamsObject()).toEqual({ param1: "ab c", param2: "" });
  });

  it("should return value for specified search param from window object", () => {
    expect(extractSearchParam("param1")).toEqual("ab c");
  });

  it("should create query string from given object", () => {
    expect(
      sortQueryString(createSearchParam({ param1: "ab c", param2: "" }))
    ).toEqual(sortQueryString("param1=ab+c&param2="));
  });

  it("should return query string which combines provided param object and window.location.search", () => {
    expect(
      sortQueryString(addSearchParam({ param4: "", param3: "x y" }))
    ).toEqual(sortQueryString("param1=ab+c&param2=&param3=x+y&param4="));
  });

  it("should return query string from window.location.search but remove the provided param from it", () => {
    expect(sortQueryString(removeSearchParam("param2"))).toEqual(
      sortQueryString("param1=ab+c")
    );
  });
});
