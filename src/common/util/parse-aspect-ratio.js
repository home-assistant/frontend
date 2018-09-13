export default function parseAspectRatio(input) {
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
