import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CHALLENGE_TYPE_OPTIONS,
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
