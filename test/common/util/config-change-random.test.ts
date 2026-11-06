import { describe, expect, it } from "vitest";
import {
  applyConfigChanges,
  diffConfigs,
  invertConfigChanges,
} from "../../../src/common/util/config-change";
import { deepEqual } from "../../../src/common/util/deep-equal";

// Undo replays computed changes on deep automation trees. Random edits catch
// trees and edit combinations the hand-written cases miss.

const random = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

type Node = Record<string, unknown>;

const createAction = (rand: () => number, depth: number): Node => {
  const kind = Math.floor(rand() * 4);
  if (depth > 3 || kind === 0) {
    return { delay: Math.floor(rand() * 10), alias: rand() > 0.5 ? "A" : "B" };
  }
  const list = () =>
    Array.from({ length: Math.floor(rand() * 4) }, () =>
      createAction(rand, depth + 1)
    );
  if (kind === 1) {
    return { if: [{ condition: "state" }], then: list(), else: list() };
  }
  if (kind === 2) {
    return { choose: [{ conditions: [], sequence: list() }], default: list() };
  }
  return { parallel: list() };
};

const lists = (node: unknown, found: unknown[][] = []): unknown[][] => {
  if (Array.isArray(node)) {
    found.push(node);
    node.forEach((item) => lists(item, found));
  } else if (node && typeof node === "object") {
    Object.values(node).forEach((value) => lists(value, found));
  }
  return found;
};

const objects = (node: unknown, found: Node[] = []): Node[] => {
  if (Array.isArray(node)) {
    node.forEach((item) => objects(item, found));
  } else if (node && typeof node === "object") {
    found.push(node as Node);
    Object.values(node).forEach((value) => objects(value, found));
  }
  return found;
};

// Edits a deep copy in place, like the YAML editor, which creates new objects
const edit = (rand: () => number, config: Node): Node => {
  const copy = structuredClone(config);
  const edits = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < edits; i++) {
    const allLists = lists(copy);
    const allObjects = objects(copy);
    const list = allLists[Math.floor(rand() * allLists.length)];
    const object = allObjects[Math.floor(rand() * allObjects.length)];
    switch (Math.floor(rand() * 7)) {
      case 0:
        list.splice(Math.floor(rand() * (list.length + 1)), 0, {
          delay: 99,
        });
        break;
      case 1:
        list.splice(Math.floor(rand() * list.length), 1);
        break;
      case 2: {
        const [item] = list.splice(Math.floor(rand() * list.length), 1);
        if (item !== undefined) {
          list.splice(Math.floor(rand() * (list.length + 1)), 0, item);
        }
        break;
      }
      case 3:
        object.alias = `alias ${Math.floor(rand() * 5)}`;
        break;
      case 4:
        delete object[Object.keys(object)[0]];
        break;
      case 5: {
        // Key order only
        const entries = Object.entries(object).reverse();
        Object.keys(object).forEach((key) => delete object[key]);
        entries.forEach(([key, value]) => {
          object[key] = value;
        });
        break;
      }
      default:
        object.enabled = rand() > 0.5;
    }
  }
  return copy;
};

const equal = (a: unknown, b: unknown) =>
  deepEqual(a, b, { compareKeyOrder: true });

describe("config changes on random automations", () => {
  it("apply and invert to exactly the edited and original config", () => {
    const rand = random(42);
    for (let run = 0; run < 500; run++) {
      let config: Node = {
        alias: "Random",
        triggers: [{ trigger: "sun" }],
        actions: Array.from({ length: 1 + Math.floor(rand() * 4) }, () =>
          createAction(rand, 0)
        ),
      };
      const history: { before: Node; after: Node }[] = [];
      for (let step = 0; step < 5; step++) {
        const after = edit(rand, config);
        const changes = diffConfigs(config, after);
        const applied = applyConfigChanges(config, changes);
        expect(equal(applied, after), JSON.stringify({ config, after })).toBe(
          true
        );
        // The configs undo and redo work on are the replayed ones
        history.push({ before: config, after: applied });
        config = applied;
      }
      // Undo all steps one after the other, then redo them
      for (const { before, after } of [...history].reverse()) {
        const changes = invertConfigChanges(diffConfigs(before, after));
        config = applyConfigChanges(config, changes);
        expect(equal(config, before), "undo").toBe(true);
      }
      for (const { before, after } of history) {
        config = applyConfigChanges(config, diffConfigs(before, after));
        expect(equal(config, after), "redo").toBe(true);
      }
    }
  });
});
