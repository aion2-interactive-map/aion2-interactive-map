/**
 * Artifact scheduled refresh times: Tue, Thu, Sat at 13:00 UTC
 */
const SCHEDULED_DAYS = [2, 4, 6]; // Tue, Thu, Sat
const REFRESH_HOUR = 13;

/**
 * Gets the next scheduled refresh time after the given timestamp
 */
export const getNextScheduledTime = (currentTime: number): number => {
  const now = new Date(currentTime);
  let minDiff = Infinity;
  let nextTarget = currentTime;

  for (const day of SCHEDULED_DAYS) {
    const target = new Date(now);
    target.setUTCHours(REFRESH_HOUR, 0, 0, 0);
    
    let daysUntil = (day - now.getUTCDay() + 7) % 7;
    
    // If it's the target day but past the refresh hour, go to next week
    if (daysUntil === 0 && now.getTime() >= target.getTime()) {
      daysUntil = 7;
    }
    
    target.setUTCDate(now.getUTCDate() + daysUntil);
    const diff = target.getTime() - now.getTime();
    if (diff < minDiff) {
      minDiff = diff;
      nextTarget = target.getTime();
    }
  }

  return nextTarget;
};

/**
 * Gets the most recent scheduled refresh time before or at the given timestamp
 */
export const getLastScheduledTime = (currentTime: number): number => {
  const now = new Date(currentTime);
  let maxTime = -Infinity;
  let lastTarget = currentTime;

  for (const day of SCHEDULED_DAYS) {
    const target = new Date(now);
    target.setUTCHours(REFRESH_HOUR, 0, 0, 0);
    
    let daysAgo = (now.getUTCDay() - day + 7) % 7;
    
    // If it's the target day but before the refresh hour, go to the previous refresh
    if (daysAgo === 0 && now.getTime() < target.getTime()) {
      daysAgo = 7;
    }
    
    target.setUTCDate(now.getUTCDate() - daysAgo);
    const time = target.getTime();
    if (time > maxTime) {
      maxTime = time;
      lastTarget = time;
    }
  }

  return lastTarget;
};
