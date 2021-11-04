// https://gist.github.com/hagemann/382adfc57adbd5af078dc93feef01fe1
export const slugify = (value: string, delimiter = "_") => {
  const a =
    "àáäâãåăæąçćčđďèéěėëêęğǵḧìíïîįłḿǹńňñòóöôœøṕŕřßşśšșťțùúüûǘůűūųẃẍÿýźžż·/_,:;";
  const b = `aaaaaaaaacccddeeeeeeegghiiiiilmnnnnooooooprrsssssttuuuuuuuuuwxyyzzz${delimiter}${delimiter}${delimiter}${delimiter}${delimiter}${delimiter}`;
  const p = new RegExp(a.split("").join("|"), "g");

  return value
    .toString()
    .toLowerCase()
    .replace(/\s+/g, delimiter) // Replace spaces with delimiter
    .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, `${delimiter}and${delimiter}`) // Replace & with 'and'
    .replace(/[^\w-]+/g, "") // Remove all non-word characters
    .replace(/-/g, delimiter) // Replace - with delimiter
    .replace(new RegExp(`(${delimiter})\\1+`, "g"), "$1") // Replace multiple delimiters with single delimiter
    .replace(new RegExp(`^${delimiter}+`), "") // Trim delimiter from start of text
    .replace(new RegExp(`${delimiter}+$`), ""); // Trim delimiter from end of text
};
