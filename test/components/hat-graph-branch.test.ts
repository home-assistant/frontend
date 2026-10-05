import { expect, it } from "vitest";
import "../../src/components/trace/hat-graph-branch";

it("refreshes reused branch tracking and geometry without replacing the slot", async () => {
  const graph = document.createElement("hat-graph-branch");
  const branch = document.createElement("div");
  let height = 40;
  Object.defineProperties(branch, {
    clientWidth: { get: () => 50 },
    clientHeight: { get: () => height },
  });
  graph.append(branch);
  document.body.append(graph);
  try {
    await graph.updateComplete;
    await graph.updateComplete;
    expect(graph._branches[0]).toMatchObject({
      height: 40,
      track: false,
      trackEnd: false,
    });

    branch.setAttribute("track", "");
    branch.setAttribute("unfinished", "");
    await Promise.resolve();
    await graph.updateComplete;
    expect(graph._branches[0]).toMatchObject({ track: true, trackEnd: false });

    branch.removeAttribute("unfinished");
    height = 80;
    branch.append(document.createElement("div"));
    await Promise.resolve();
    await graph.updateComplete;
    expect(graph._branches[0]).toMatchObject({
      height: 80,
      track: true,
      trackEnd: true,
    });

    branch.removeAttribute("track");
    await Promise.resolve();
    await graph.updateComplete;
    expect(graph._branches[0]).toMatchObject({ track: false, trackEnd: false });
  } finally {
    graph.remove();
  }
});
