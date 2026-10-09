import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveMatchOutcome } from './remakes.mjs';

test('a short ranked solo game is counted as a remake loss even if source says win', () => {
  const outcome = resolveMatchOutcome({
    game: { game_type: 'SOLORANKED' },
    rawResult: 'win',
    duration: 180,
    queueType: 'SOLORANKED',
  });
  assert.deepEqual(outcome, { isRemake: true, win: false });
});

test('an explicitly identified ranked solo remake is a loss even if duration is long', () => {
  const outcome = resolveMatchOutcome({
    game: { game_type: 'SOLORANKED', result: 'Remake' },
    rawResult: 'win',
    duration: 700,
    queueType: 'SOLORANKED',
  });
  assert.deepEqual(outcome, { isRemake: true, win: false });
});

test('a normal ranked solo victory remains a victory', () => {
  const outcome = resolveMatchOutcome({
    game: { game_type: 'SOLORANKED' },
    rawResult: 'win',
    duration: 1500,
    queueType: 'SOLORANKED',
  });
  assert.deepEqual(outcome, { isRemake: false, win: true });
});

test('a normal ranked solo defeat remains a defeat, not a remake', () => {
  const outcome = resolveMatchOutcome({
    game: { game_type: 'SOLORANKED' },
    rawResult: 'loss',
    duration: 1500,
    queueType: 'SOLORANKED',
  });
  assert.deepEqual(outcome, { isRemake: false, win: false });
});

test('a short game outside ranked solo queue is not automatically a remake loss', () => {
  const outcome = resolveMatchOutcome({
    game: { game_type: 'ARAM' },
    rawResult: 'win',
    duration: 180,
    queueType: 'ARAM',
  });
  assert.deepEqual(outcome, { isRemake: false, win: true });
});
