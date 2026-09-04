// Mocked WebSocket subscriptions are registered synchronously, so a callback
// invoked straight away can land before the subscriber is ready for it: pages
// that ignore messages received before their first render drop it, and
// `createCollection` overwrites it with the empty initial fetch. Emitting the
// first message from a timeout matches the real backend, which always answers
// asynchronously.
export const emitInitial = (send: () => void): (() => void) => {
  const timeout = window.setTimeout(send, 0);
  return () => clearTimeout(timeout);
};
