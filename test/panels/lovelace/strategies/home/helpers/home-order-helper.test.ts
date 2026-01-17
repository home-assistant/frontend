import { assert, describe, it } from "vitest";
import type { AreaRegistryEntry } from "../../../../../../src/data/area/area_registry";
import type { AreasFloorOrder } from "../../../../../../src/data/frontend";
import type { FloorRegistryEntry } from "../../../../../../src/data/floor_registry";
import type { AreasFloorHierarchy } from "../../../../../../src/common/areas/areas-floor-hierarchy";
import {
  applyFloorOrder,
  applyAreasOrder,
  buildAreasOrderFromHierarchy,
  cleanStaleAreasOrder,
} from "../../../../../../src/panels/lovelace/strategies/home/helpers/home-order-helper";

// Test data fixtures
const createFloor = (id: string, name: string): FloorRegistryEntry => ({
  floor_id: id,
  name,
  level: null,
  icon: null,
  aliases: [],
  created_at: Date.now() / 1000,
  modified_at: Date.now() / 1000,
});

const createArea = (
  id: string,
  name: string,
  floorId?: string
): AreaRegistryEntry => ({
  area_id: id,
  name,
  picture: null,
  icon: null,
  floor_id: floorId || null,
  aliases: [],
  labels: [],
  humidity_entity_id: null,
  temperature_entity_id: null,
  created_at: Date.now() / 1000,
  modified_at: Date.now() / 1000,
});

describe("applyFloorOrder", () => {
  it("should maintain original order when no custom order provided", () => {
    const floors = [
      createFloor("floor_1", "First Floor"),
      createFloor("floor_2", "Second Floor"),
      createFloor("floor_3", "Third Floor"),
    ];

    const result = applyFloorOrder(floors);

    assert.deepEqual(result, floors);
  });

  it("should maintain original order when empty custom order provided", () => {
    const floors = [
      createFloor("floor_1", "First Floor"),
      createFloor("floor_2", "Second Floor"),
    ];

    const result = applyFloorOrder(floors, []);

    assert.deepEqual(result, floors);
  });

  it("should sort floors according to custom order", () => {
    const floors = [
      createFloor("floor_1", "First Floor"),
      createFloor("floor_2", "Second Floor"),
      createFloor("floor_3", "Third Floor"),
    ];

    const customOrder = ["floor_3", "floor_1", "floor_2"];
    const result = applyFloorOrder(floors, customOrder);

    assert.strictEqual(result[0].floor_id, "floor_3");
    assert.strictEqual(result[1].floor_id, "floor_1");
    assert.strictEqual(result[2].floor_id, "floor_2");
  });

  it("should place floors not in custom order at the end", () => {
    const floors = [
      createFloor("floor_1", "First Floor"),
      createFloor("floor_2", "Second Floor"),
      createFloor("floor_3", "Third Floor"),
      createFloor("floor_4", "Fourth Floor"),
    ];

    const customOrder = ["floor_2", "floor_4"];
    const result = applyFloorOrder(floors, customOrder);

    assert.strictEqual(result[0].floor_id, "floor_2");
    assert.strictEqual(result[1].floor_id, "floor_4");
    // floor_1 and floor_3 should be at the end (order between them may vary)
    const lastTwoIds = [result[2].floor_id, result[3].floor_id];
    assert.ok(lastTwoIds.includes("floor_1"));
    assert.ok(lastTwoIds.includes("floor_3"));
  });

  it("should not mutate original array", () => {
    const floors = [
      createFloor("floor_1", "First Floor"),
      createFloor("floor_2", "Second Floor"),
    ];
    const originalOrder = floors.map((f) => f.floor_id);

    applyFloorOrder(floors, ["floor_2", "floor_1"]);

    assert.deepEqual(
      floors.map((f) => f.floor_id),
      originalOrder
    );
  });

  it("should handle single floor", () => {
    const floors = [createFloor("floor_1", "First Floor")];
    const result = applyFloorOrder(floors, ["floor_1"]);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].floor_id, "floor_1");
  });
});

describe("applyAreasOrder", () => {
  it("should maintain original hierarchy when no custom order provided", () => {
    const hierarchy: AreasFloorHierarchy = {
      floors: [
        {
          id: "floor_1",
          areas: ["area_1", "area_2", "area_3"],
        },
      ],
      areas: ["area_4", "area_5"],
    };

    const result = applyAreasOrder(hierarchy);

    assert.deepEqual(result, hierarchy);
  });

  it("should sort areas within floors according to custom order", () => {
    const hierarchy: AreasFloorHierarchy = {
      floors: [
        {
          id: "floor_1",
          areas: ["area_1", "area_2", "area_3"],
        },
        {
          id: "floor_2",
          areas: ["area_4", "area_5"],
        },
      ],
      areas: [],
    };

    const customOrder: AreasFloorOrder = {
      areas: {
        floor_1: ["area_2", "area_3", "area_1"],
        floor_2: ["area_5", "area_4"],
      },
    };

    const result = applyAreasOrder(hierarchy, customOrder);

    assert.deepEqual(result.floors[0].areas, ["area_2", "area_3", "area_1"]);
    assert.deepEqual(result.floors[1].areas, ["area_5", "area_4"]);
  });

  it("should handle partial custom order (only some floors configured)", () => {
    const hierarchy: AreasFloorHierarchy = {
      floors: [
        {
          id: "floor_1",
          areas: ["area_1", "area_2"],
        },
        {
          id: "floor_2",
          areas: ["area_3", "area_4"],
        },
      ],
      areas: [],
    };

    const customOrder: AreasFloorOrder = {
      areas: {
        floor_1: ["area_2", "area_1"],
        // floor_2 not configured
      },
    };

    const result = applyAreasOrder(hierarchy, customOrder);

    assert.deepEqual(result.floors[0].areas, ["area_2", "area_1"]);
    assert.deepEqual(result.floors[1].areas, ["area_3", "area_4"]); // Original order
  });

  it("should handle empty areas array for a floor", () => {
    const hierarchy: AreasFloorHierarchy = {
      floors: [
        {
          id: "floor_1",
          areas: ["area_1", "area_2"],
        },
      ],
      areas: [],
    };

    const customOrder: AreasFloorOrder = {
      areas: {
        floor_1: [],
      },
    };

    const result = applyAreasOrder(hierarchy, customOrder);

    assert.deepEqual(result.floors[0].areas, ["area_1", "area_2"]); // Original order
  });

  it("should not mutate original hierarchy", () => {
    const hierarchy: AreasFloorHierarchy = {
      floors: [
        {
          id: "floor_1",
          areas: ["area_1", "area_2"],
        },
      ],
      areas: ["area_3"],
    };

    const customOrder: AreasFloorOrder = {
      areas: {
        floor_1: ["area_2", "area_1"],
      },
    };

    applyAreasOrder(hierarchy, customOrder);

    assert.deepEqual(hierarchy.floors[0].areas, ["area_1", "area_2"]);
  });

  it("should handle complex hierarchy with both floors and unassigned areas", () => {
    const hierarchy: AreasFloorHierarchy = {
      floors: [
        {
          id: "floor_1",
          areas: ["area_1", "area_2", "area_3"],
        },
        {
          id: "floor_2",
          areas: ["area_4", "area_5"],
        },
      ],
      areas: ["area_6", "area_7", "area_8"],
    };

    const customOrder: AreasFloorOrder = {
      areas: {
        floor_1: ["area_3", "area_1", "area_2"],
        floor_2: ["area_5", "area_4"],
      },
    };

    const result = applyAreasOrder(hierarchy, customOrder);

    assert.deepEqual(result.floors[0].areas, ["area_3", "area_1", "area_2"]);
    assert.deepEqual(result.floors[1].areas, ["area_5", "area_4"]);
    // Unassigned areas remain in original order (not sorted)
    assert.deepEqual(result.areas, ["area_6", "area_7", "area_8"]);
  });

  it("should place areas not in custom order at the end", () => {
    const hierarchy: AreasFloorHierarchy = {
      floors: [
        {
          id: "floor_1",
          areas: ["area_1", "area_2", "area_3", "area_4"],
        },
      ],
      areas: [],
    };

    const customOrder: AreasFloorOrder = {
      areas: {
        floor_1: ["area_3", "area_1"],
      },
    };

    const result = applyAreasOrder(hierarchy, customOrder);

    assert.strictEqual(result.floors[0].areas[0], "area_3");
    assert.strictEqual(result.floors[0].areas[1], "area_1");
    // area_2 and area_4 should be at the end
    const lastTwoIds = [result.floors[0].areas[2], result.floors[0].areas[3]];
    assert.ok(lastTwoIds.includes("area_2"));
    assert.ok(lastTwoIds.includes("area_4"));
  });
});

describe("buildAreasOrderFromHierarchy", () => {
  it("should build configuration from simple hierarchy", () => {
    const hierarchy: AreasFloorHierarchy = {
      floors: [
        {
          id: "floor_1",
          areas: ["area_1", "area_2"],
        },
      ],
      areas: ["area_3"],
    };

    const result = buildAreasOrderFromHierarchy(hierarchy);

    assert.deepEqual(result, {
      floors: ["floor_1"],
      areas: {
        floor_1: ["area_1", "area_2"],
      },
    });
  });

  it("should build configuration from complex hierarchy", () => {
    const hierarchy: AreasFloorHierarchy = {
      floors: [
        {
          id: "floor_1",
          areas: ["area_1", "area_2", "area_3"],
        },
        {
          id: "floor_2",
          areas: ["area_4", "area_5"],
        },
        {
          id: "floor_3",
          areas: ["area_6"],
        },
      ],
      areas: ["area_7", "area_8"],
    };

    const result = buildAreasOrderFromHierarchy(hierarchy);

    assert.deepEqual(result.floors, ["floor_1", "floor_2", "floor_3"]);
    assert.deepEqual(result.areas, {
      floor_1: ["area_1", "area_2", "area_3"],
      floor_2: ["area_4", "area_5"],
      floor_3: ["area_6"],
    });
  });

  it("should handle hierarchy with no floors", () => {
    const hierarchy: AreasFloorHierarchy = {
      floors: [],
      areas: ["area_1", "area_2"],
    };

    const result = buildAreasOrderFromHierarchy(hierarchy);

    assert.deepEqual(result.floors, []);
    assert.deepEqual(result.areas, {});
  });

  it("should handle hierarchy with no unassigned areas", () => {
    const hierarchy: AreasFloorHierarchy = {
      floors: [
        {
          id: "floor_1",
          areas: ["area_1", "area_2"],
        },
      ],
      areas: [],
    };

    const result = buildAreasOrderFromHierarchy(hierarchy);

    assert.deepEqual(result.floors, ["floor_1"]);
    assert.deepEqual(result.areas, {
      floor_1: ["area_1", "area_2"],
    });
  });

  it("should handle floor with empty areas array", () => {
    const hierarchy: AreasFloorHierarchy = {
      floors: [
        {
          id: "floor_1",
          areas: [],
        },
      ],
      areas: [],
    };

    const result = buildAreasOrderFromHierarchy(hierarchy);

    assert.deepEqual(result.floors, ["floor_1"]);
    assert.deepEqual(result.areas, {
      floor_1: [],
    });
  });
});

describe("cleanStaleAreasOrder", () => {
  it("should remove stale floor IDs from floor order", () => {
    const areasOrder: AreasFloorOrder = {
      floors: ["floor_1", "floor_2", "floor_3"],
      areas: {},
    };

    const areas: AreaRegistryEntry[] = [];
    const floors = [
      createFloor("floor_1", "Floor 1"),
      createFloor("floor_3", "Floor 3"),
    ];

    const result = cleanStaleAreasOrder(areasOrder, areas, floors);

    assert.deepEqual(result.floors, ["floor_1", "floor_3"]);
  });

  it("should remove stale area IDs from floor areas", () => {
    const areasOrder: AreasFloorOrder = {
      areas: {
        floor_1: ["area_1", "area_2", "area_3"],
      },
    };

    const areas = [
      createArea("area_1", "Area 1"),
      createArea("area_3", "Area 3"),
    ];
    const floors = [createFloor("floor_1", "Floor 1")];

    const result = cleanStaleAreasOrder(areasOrder, areas, floors);

    assert.deepEqual(result.areas, {
      floor_1: ["area_1", "area_3"],
    });
  });

  it("should remove floor sections for deleted floors", () => {
    const areasOrder: AreasFloorOrder = {
      areas: {
        floor_1: ["area_1"],
        floor_2: ["area_2"],
        floor_3: ["area_3"],
      },
    };

    const areas = [
      createArea("area_1", "Area 1"),
      createArea("area_2", "Area 2"),
      createArea("area_3", "Area 3"),
    ];
    const floors = [
      createFloor("floor_1", "Floor 1"),
      createFloor("floor_3", "Floor 3"),
    ];

    const result = cleanStaleAreasOrder(areasOrder, areas, floors);

    assert.deepEqual(result.areas, {
      floor_1: ["area_1"],
      floor_3: ["area_3"],
    });
    assert.ok(!result.areas?.floor_2);
  });

  it("should remove empty floor sections after cleaning", () => {
    const areasOrder: AreasFloorOrder = {
      areas: {
        floor_1: ["area_1", "area_2"],
        floor_2: ["area_3", "area_4"],
      },
    };

    const areas = [createArea("area_1", "Area 1")];
    const floors = [
      createFloor("floor_1", "Floor 1"),
      createFloor("floor_2", "Floor 2"),
    ];

    const result = cleanStaleAreasOrder(areasOrder, areas, floors);

    assert.deepEqual(result.areas, {
      floor_1: ["area_1"],
    });
    assert.ok(!result.areas?.floor_2);
  });

  it("should handle configuration with all stale data", () => {
    const areasOrder: AreasFloorOrder = {
      floors: ["floor_deleted"],
      areas: {
        floor_deleted: ["area_deleted"],
      },
    };

    const areas: AreaRegistryEntry[] = [];
    const floors: FloorRegistryEntry[] = [];

    const result = cleanStaleAreasOrder(areasOrder, areas, floors);

    assert.deepEqual(result.floors, []);
    assert.strictEqual(result.areas, undefined);
  });

  it("should handle configuration with no stale data", () => {
    const areasOrder: AreasFloorOrder = {
      floors: ["floor_1", "floor_2"],
      areas: {
        floor_1: ["area_1", "area_2"],
        floor_2: ["area_3"],
      },
    };

    const areas = [
      createArea("area_1", "Area 1"),
      createArea("area_2", "Area 2"),
      createArea("area_3", "Area 3"),
      createArea("area_4", "Area 4"),
    ];
    const floors = [
      createFloor("floor_1", "Floor 1"),
      createFloor("floor_2", "Floor 2"),
    ];

    const result = cleanStaleAreasOrder(areasOrder, areas, floors);

    assert.deepEqual(result, areasOrder);
  });

  it("should handle empty configuration", () => {
    const areasOrder: AreasFloorOrder = {};

    const areas = [createArea("area_1", "Area 1")];
    const floors = [createFloor("floor_1", "Floor 1")];

    const result = cleanStaleAreasOrder(areasOrder, areas, floors);

    assert.deepEqual(result, {
      floors: undefined,
      areas: undefined,
    });
  });

  it("should handle partial configuration with mixed stale and valid data", () => {
    const areasOrder: AreasFloorOrder = {
      floors: ["floor_1", "floor_deleted", "floor_2"],
      areas: {
        floor_1: ["area_1", "area_deleted", "area_2"],
        floor_deleted: ["area_3"],
      },
    };

    const areas = [
      createArea("area_1", "Area 1"),
      createArea("area_2", "Area 2"),
      createArea("area_4", "Area 4"),
      createArea("area_5", "Area 5"),
    ];
    const floors = [
      createFloor("floor_1", "Floor 1"),
      createFloor("floor_2", "Floor 2"),
    ];

    const result = cleanStaleAreasOrder(areasOrder, areas, floors);

    assert.deepEqual(result.floors, ["floor_1", "floor_2"]);
    assert.deepEqual(result.areas, {
      floor_1: ["area_1", "area_2"],
    });
  });
});
