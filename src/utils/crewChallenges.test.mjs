import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CHALLENGE_TYPE_OPTIONS,
  calculateChallengeStandings,
  calculateCrewPointTotals,
  calculatePointAwards,
  getChallengeTypeLabel,
  getChallengeTitle,
} from './crewChallenges.js'

test('crew challenge presets include the first weekly set', () => {
  assert.deepEqual(
    CHALLENGE_TYPE_OPTIONS.map(option => option.value),
    ['lowest_9', 'lowest_18', 'post_next_round', 'most_rounds', 'best_net_score'],
  )
})

test('crew challenge title falls back to the selected preset label', () => {
  assert.equal(getChallengeTypeLabel('lowest_18'), 'Lowest 18 this week')
  assert.equal(getChallengeTitle({ challenge_type: 'lowest_18', title: '' }), 'Lowest 18 this week')
  assert.equal(getChallengeTitle({ challenge_type: 'lowest_18', title: 'Beat the captain' }), 'Beat the captain')
})

test('lowest 9 standings rank each member by their best qualifying score this week', () => {
  const standings = calculateChallengeStandings({
    challenge: { challenge_type: 'lowest_9', created_at: '2026-05-04T12:00:00Z' },
    members: [
      { user_id: 'u1', profile: { name: 'Arjun' } },
      { user_id: 'u2', profile: { name: 'Sam' } },
    ],
    rounds: [
      { user_id: 'u1', score: 41, holes: 9, date: '2026-05-05' },
      { user_id: 'u1', score: 39, holes: 9, date: '2026-05-06' },
      { user_id: 'u2', score: 44, holes: 9, date: '2026-05-06' },
      { user_id: 'u2', score: 80, holes: 18, date: '2026-05-06' },
      { user_id: 'u2', score: 38, holes: 9, date: '2026-04-30' },
    ],
  })

  assert.deepEqual(standings.map(row => [row.userId, row.rank, row.value]), [
    ['u1', 1, 39],
    ['u2', 2, 44],
  ])
})

test('most rounds standings rank by count descending and award participation points', () => {
  const standings = calculateChallengeStandings({
    challenge: { challenge_type: 'most_rounds', created_at: '2026-05-04T12:00:00Z' },
    members: [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3' }],
    rounds: [
      { user_id: 'u1', score: 88, holes: 18, date: '2026-05-04' },
      { user_id: 'u1', score: 91, holes: 18, date: '2026-05-06' },
      { user_id: 'u2', score: 42, holes: 9, date: '2026-05-06' },
    ],
  })

  assert.deepEqual(standings.map(row => [row.userId, row.rank, row.value]), [
    ['u1', 1, 2],
    ['u2', 2, 1],
  ])
  assert.deepEqual(calculatePointAwards(standings).map(row => [row.userId, row.points]), [
    ['u1', 6],
    ['u2', 4],
  ])
})

test('best net score standings subtract estimated handicap from 18-hole scores', () => {
  const standings = calculateChallengeStandings({
    challenge: { challenge_type: 'best_net_score', created_at: '2026-05-04T12:00:00Z' },
    members: [
      { user_id: 'u1', profile: { name: 'Scratch', handicap_range: 'scratch' } },
      { user_id: 'u2', profile: { name: 'Nineties', handicap_range: '90s' } },
    ],
    rounds: [
      { user_id: 'u1', score: 76, holes: 18, date: '2026-05-05' },
      { user_id: 'u2', score: 94, holes: 18, date: '2026-05-05' },
    ],
  })

  assert.deepEqual(standings.map(row => [row.userId, row.rank, row.value, row.label]), [
    ['u2', 1, 69, 'Net 69'],
    ['u1', 2, 76, 'Net 76'],
  ])
})


test('crew point totals aggregate by crew and user', () => {
  assert.deepEqual(calculateCrewPointTotals([
    { crew_id: 'c1', user_id: 'u1', points: 6 },
    { crew_id: 'c1', user_id: 'u1', points: 4 },
    { crew_id: 'c1', user_id: 'u2', points: 1 },
    { crew_id: 'c2', user_id: 'u1', points: 2 },
  ]), {
    c1: { total: 11, byUser: { u1: 10, u2: 1 } },
    c2: { total: 2, byUser: { u1: 2 } },
  })
})


test('lowest 9 standings ignore 18-hole rounds', () => {
  const standings = calculateChallengeStandings({
    challenge: { challenge_type: 'lowest_9', created_at: '2026-05-04T12:00:00Z' },
    members: [{ user_id: 'u1', profile: { name: 'Arjun' } }],
    rounds: [
      { user_id: 'u1', score: 82, holes: 18, date: '2026-05-06' },
    ],
  })

  assert.deepEqual(standings, [])
})
