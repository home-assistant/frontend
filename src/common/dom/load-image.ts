/** Loads an image, resolves with undefined when it can't be loaded. */
export const loadImage = (url: string): Promise<HTMLImageElement | undefined> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(undefined);
    image.src = url;
  });
