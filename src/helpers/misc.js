export const getRandomString = (charCount=3) =>
  Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substr(0, charCount)
