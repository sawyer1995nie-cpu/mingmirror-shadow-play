export const isFist = (openness: number, wasFist: boolean) =>
  openness <= (wasFist ? 0.38 : 0.22);
