export const valueToDate = (value?: string): Date => {
  if (!value) {
    return new Date();
  }

  const date = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return new Date(`${date ?? value}T00:00:00`);
};
