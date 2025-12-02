import { themeStyles } from "./theme/theme";

const styleElement = document.createElement("style");
styleElement.textContent = themeStyles;
document.head.append(styleElement);
