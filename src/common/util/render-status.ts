export const afterNextRender = (cb: () => void): void => {
  requestAnimationFrame(() => setTimeout(cb, 0));
};
