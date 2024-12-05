export const wait = async (s: number) => {
  await new Promise((resolve, reject) => setTimeout(resolve, 1000 * s));
};
