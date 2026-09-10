const CLAIM_LOCKUP_PROBE_PX = 80;
const CLAIM_LOCKUP_WIDTH_FILL = 0.99;

function applySharedSize(lines: HTMLElement[], size: number) {
  for (const line of lines) {
    line.style.fontSize = `${size}px`;
  }
}

function longestLineWidth(lines: HTMLElement[]) {
  return Math.max(...lines.map((line) => line.getBoundingClientRect().width));
}

export function fitClaimLockup(lockup: HTMLElement): void {
  const lines = [...lockup.querySelectorAll("span")] as HTMLElement[];
  if (lines.length === 0) return;

  const availableWidth = lockup.clientWidth;
  const availableHeight = lockup.clientHeight;
  if (!availableWidth || !availableHeight) return;

  const current =
    parseFloat(lines[0].style.fontSize) ||
    parseFloat(getComputedStyle(lines[0]).fontSize) ||
    CLAIM_LOCKUP_PROBE_PX;

  applySharedSize(lines, current);

  const longest = longestLineWidth(lines);
  if (!longest) return;

  let size = current * ((availableWidth * CLAIM_LOCKUP_WIDTH_FILL) / longest);
  applySharedSize(lines, size);

  for (let pass = 0; pass < 2; pass += 1) {
    const overflowWidth = longestLineWidth(lines);
    if (overflowWidth <= availableWidth) break;
    size *= availableWidth / overflowWidth;
    applySharedSize(lines, size);
  }

  if (lockup.scrollHeight > availableHeight) {
    size *= availableHeight / lockup.scrollHeight;
    applySharedSize(lines, size);
  }
}
