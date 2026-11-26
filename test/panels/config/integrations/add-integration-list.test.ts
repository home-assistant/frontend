import { describe, expect, it } from "vitest";
import {
  inCategory,
  ofConnection,
} from "../../../../src/panels/config/integrations/add-integration-list";

describe("inCategory", () => {
  it("matches a category, its subcategories, and only those", () => {
    const categories = ["energy.ev_charging", "climate"];
    expect(inCategory(categories)).toBe(true);
    expect(inCategory(categories, "energy")).toBe(true);
    expect(inCategory(categories, "energy", "ev_charging")).toBe(true);
    expect(inCategory(categories, "energy", "solar")).toBe(false);
    expect(inCategory(categories, "climate")).toBe(true);
    expect(inCategory(categories, "climate", "thermostats")).toBe(false);
    expect(inCategory(["energy_storage"], "energy")).toBe(false);
    expect(inCategory(undefined, "energy")).toBe(false);
  });
});

describe("ofConnection", () => {
  it("keeps everything without a connection, else local or cloud", () => {
    const local = { id: "a", domain: "a", name: "A" };
    const cloud = { ...local, cloud: true };
    expect(ofConnection(local)).toBe(true);
    expect(ofConnection(cloud)).toBe(true);
    expect(ofConnection(local, "local")).toBe(true);
    expect(ofConnection(cloud, "local")).toBe(false);
    expect(ofConnection(local, "cloud")).toBe(false);
    expect(ofConnection(cloud, "cloud")).toBe(true);
  });
});
