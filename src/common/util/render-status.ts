export const afterNextRender = (cb: (value: unknown) => void): void => {
  requestAnimationFrame(() => setTimeout(cb, 0));
};

export const nextRender = () =>
  new Promise((resolve) => {
    afterNextRender(resolve);
  });
