// Whether the game screen is being opened onto a run in play (docs/milestones/M14-14b-19-controls-layout-and-state.md,
// answer 3): Continue on Today, Play with Skip the game screen, Start climbing on How to play and the clock bar's Back say
// so, so the screen starts hidden behind the question's skeleton instead of showing its cards and feed for a moment. A
// page opened from its address doesn't know, and starts as before. The game screen's run reads it as it mounts and
// spends it.
let toPlay = false;

export const expectingPlay = (): boolean => toPlay;

export function markToPlay(): void {
  toPlay = true;
}

export function spendToPlay(): void {
  toPlay = false;
}
