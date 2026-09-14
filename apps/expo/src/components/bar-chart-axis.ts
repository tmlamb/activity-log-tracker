export const getBarChartTickValues = (
  maxValue: number,
  tickInterval?: number,
) => {
  if (tickInterval === undefined) return [maxValue, maxValue / 2, 0];

  const tickCount = Math.floor(maxValue / tickInterval);
  return Array.from(
    { length: tickCount + 1 },
    (_, index) => (tickCount - index) * tickInterval,
  );
};
