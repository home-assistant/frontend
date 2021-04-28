export const afterNextRender = (cb: (value: unknown) => void): void => {
  requestAnimationFrame(() => setTimeout(cb, 0));
};

export const nextRender = () => {
  return new Promise((resolve) => {
    afterNextRender(resolve);
  });
};
