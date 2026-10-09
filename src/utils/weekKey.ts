/** What a season's week is filed under, wherever one is kept. */
export default function weekKey(season: number, weekNumber: number): string {
  return `${season}:${weekNumber}`;
}
