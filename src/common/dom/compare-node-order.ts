/**
 * Walks up the composed tree (jumping shadow roots → their hosts), returning
 * the ancestor chain top-down. Used to compare two nodes that may live in
 * different shadow trees — `Node.compareDocumentPosition` only works within a
 * single root and returns `DOCUMENT_POSITION_DISCONNECTED` otherwise.
 */
const composedAncestorPath = (node: Node): Node[] => {
  const path: Node[] = [];
  let cur: Node | null = node;
  while (cur) {
    path.push(cur);
    const parent = cur.parentNode;
    if (parent instanceof ShadowRoot) {
      cur = parent.host;
    } else if (parent) {
      cur = parent;
    } else {
      const root = cur.getRootNode();
      cur = root instanceof ShadowRoot ? root.host : null;
    }
  }
  return path.reverse();
};

/**
 * Document-order comparator that works across shadow boundaries. Suitable as
 * the `Array.prototype.sort` callback for collections of nodes that may live
 * in different shadow trees.
 */
export const compareNodeOrder = (a: Node, b: Node): number => {
  if (a === b) {
    return 0;
  }
  const pa = composedAncestorPath(a);
  const pb = composedAncestorPath(b);
  let i = 0;
  while (i < pa.length && i < pb.length && pa[i] === pb[i]) {
    i++;
  }
  if (i === 0) {
    return 0;
  }
  if (i === pa.length) {
    return -1;
  }
  if (i === pb.length) {
    return 1;
  }
  // pa[i] and pb[i] are siblings under the LCA, guaranteed same root.
  // eslint-disable-next-line no-bitwise
  return pa[i].compareDocumentPosition(pb[i]) & Node.DOCUMENT_POSITION_FOLLOWING
    ? -1
    : 1;
};
