export const CHALLENGE_TYPE_OPTIONS = [
  { value: 'lowest_9', label: 'Lowest 9 this week' },
  { value: 'lowest_18', label: 'Lowest 18 this week' },
  { value: 'post_next_round', label: 'Post your next round' },
  { value: 'most_rounds', label: 'Most rounds this week' },
  { value: 'best_net_score', label: 'Best net score' },
]

export const getChallengeTypeLabel = (type) => (
  CHALLENGE_TYPE_OPTIONS.find(option => option.value === type)?.label || CHALLENGE_TYPE_OPTIONS[0].label
)

export const getChallengeTitle = (challenge) => {
  const title = challenge?.title?.trim()
  return title || getChallengeTypeLabel(challenge?.challenge_type)
}
