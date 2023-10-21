// https://gist.github.com/hagemann/382adfc57adbd5af078dc93feef01fe1
export const slugify = (value: string, delimiter = "_") => {
  const a =
    "àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìıİłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·";
  const b = `aaaaaaaaaacccddeeeeeeeegghiiiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz${delimiter}`;
  const p = new RegExp(a.split("").join("|"), "g");

  const slugified = value
    .toString()
    .toLowerCase()
    .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/(?<=\d),(?=\d)/g, "") // Remove Commas between numbers
    .replace(/[^a-z0-9]+/g, delimiter) // Replace all non-word characters
    .replace(new RegExp(`(${delimiter})\\1+`, "g"), "$1") // Replace multiple delimiters with single delimiter
    .replace(new RegExp(`^${delimiter}+`), "") // Trim delimiter from start of text
    .replace(new RegExp(`${delimiter}+$`), ""); // Trim delimiter from end of text

  if (value == "") {
    return "";
  } else if (slugified == "") {
    return "unknown";
  } else {
    return slugified;
  }
};
