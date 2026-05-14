import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateRoundStats,
  estimateHandicapFromAverages,
  getProfileAverageScore,
} from './golfStats.js'

test('round stats keep 9 and 18 hole scoring separate', () => {
  const stats = calculateRoundStats([
    { score: 41, holes: 9 },
    { score: 39, holes: 9 },
    { score: 84, holes: 18 },
    { score: 80, holes: 18 },
  ])

  assert.equal(stats.avg9, 40)
  assert.equal(stats.avg18, 82)
  assert.equal(stats.best9, 39)
  assert.equal(stats.best18, 80)
  assert.equal(stats.count9, 2)
  assert.equal(stats.count18, 2)
})

test('profile average uses 18-hole average first and 9-hole equivalent as fallback', () => {
  assert.equal(getProfileAverageScore([
    { score: 41, holes: 9 },
    { score: 39, holes: 9 },
    { score: 84, holes: 18 },
  ]), 84)

  assert.equal(getProfileAverageScore([
    { score: 41, holes: 9 },
    { score: 39, holes: 9 },
  ]), 80)
})

test('handicap estimate uses 18-hole average or doubled 9-hole average', () => {
  assert.equal(estimateHandicapFromAverages({ avg18: 84, avg9: 39 }), 12)
  assert.equal(estimateHandicapFromAverages({ avg9: 39 }), 6)
  assert.equal(estimateHandicapFromAverages({ avg18: 69 }), 0)
})
