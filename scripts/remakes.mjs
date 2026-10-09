const REMAKE_MAX_DURATION_SECONDS = 240;

function isTruthyFlag(value) {
  return value === true || value === 1 ||
    (typeof value === 'string' && ['true', '1', 'yes'].includes(value.trim().toLowerCase()));
}

function saysRemake(value) {
  return typeof value === 'string' &&
    /remake|early[\\s_-]*surrender|no[\\s_-]*contest|void(?:ed)?/i.test(value);
}

/**
 * Resolves SoloQ match results for KOI's tracker.
 * OP.GG/Riot exclude remakes from official ranked totals, but this site counts
 * them as losses. Ranked Solo/Duo remakes normally end within four minutes.
 */
export function resolveMatchOutcome({ game = {}, stats = {}, rawResult = '', duration = 0, queueType = '' } = {}) {
  const queue = String(queueType || game.game_type || game.gameType || 'Ranked Solo/Duo').toLowerCase();
  const isSoloRanked = queue.includes('solo') && queue.includes('rank');
  const resultCandidates = [
    rawResult,
    game.result,
    game.outcome,
    game.game_end_reason,
    game.gameEndReason,
    game.end_reason,
    game.endReason,
    game.game_type,
    game.gameType,
    stats.result,
    stats.outcome,
    stats.end_reason,
    stats.endReason,
  ];
  const explicitRemake =
    resultCandidates.some(saysRemake) ||
    [
      game.is_remake,
      game.isRemake,
      game.remake,
      stats.is_remake,
      stats.isRemake,
      stats.remake,
    ].some(isTruthyFlag);

  const seconds = Number(duration);
  const isRemake = isSoloRanked && (
    explicitRemake ||
    (Number.isFinite(seconds) && seconds > 0 && seconds <= REMAKE_MAX_DURATION_SECONDS)
  );
  const result = String(rawResult ?? '').trim().toLowerCase();
  const win = !isRemake && ['win', 'won', 'victory', 'true', '1'].includes(result);

  return { isRemake, win };
}
