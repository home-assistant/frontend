export const loadVirtualizer = async () => {
  // The default flow layout is otherwise only fetched once there are items.
  await Promise.all([
    import("@lit-labs/virtualizer"),
    import("@lit-labs/virtualizer/layouts/flow.js"),
  ]);
};
