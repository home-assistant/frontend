const brandsBaseUrl = "https://brands.home-assistant.io/";
const imageSuffix = ".png";

export const brandsUrl = (
  domain: string,
  type: "icon" | "logo",
  useFallback?: boolean
) => {
  let brandUrl = brandsBaseUrl;

  if (useFallback) {
    brandUrl += "_/";
  }

  brandUrl += domain + "/";

  switch (type) {
    case "icon":
      brandUrl += "icon";
      break;
    case "logo":
      brandUrl += "logo";
      break;
  }

  brandUrl += imageSuffix;

  return brandUrl;
};
