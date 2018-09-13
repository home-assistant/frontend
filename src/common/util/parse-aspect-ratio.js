export default function parseAspectRatio(input) {
  // Handle 16x9, 16:9, 1.78:1, 1.78
  // Ignore everything else
  try {
    if (input) {
      let arr = input.replace(':', 'x').split('x');
      return arr.length == 0 ?
        null :
        arr.length == 1 ?
          { w: parseFloat(arr[0]), h: 1 } :
          { w: parseFloat(arr[0]), h: parseFloat(arr[1]) };
    }
  }
  catch(err) {}
  return null;
}
