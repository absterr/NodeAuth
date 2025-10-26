export const oneDayFromNow = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
export const twoWeeksFromNow = () =>
  new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
export const tenMinsFromNow = () => new Date(Date.now() + 10 * 60 * 1000);
export const tenMinsAgo = () => new Date(Date.now() - 10 * 60 * 1000);
// 24 hours in milliseconds
export const oneDay = 24 * 60 * 60 * 1000;
