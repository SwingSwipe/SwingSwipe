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

const toDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return value
  const [datePart] = String(value).split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export const getWeekWindow = (today = new Date()) => {
  const date = toDate(today) || new Date()
  const start = new Date(date)
  const day = start.getDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  start.setDate(start.getDate() - daysSinceMonday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  return { start, end }
}

const isThisWeek = (date, today) => {
  const roundDate = toDate(date)
  if (!roundDate) return false
  const { start, end } = getWeekWindow(today)
  return roundDate >= start && roundDate < end
}

const getMemberName = (member) => member?.profile?.name || member?.profiles?.name || 'Golfer'

const estimateHandicap = (member) => {
  const profile = member?.profile || member?.profiles || {}
  if (profile.handicap_range === 'scratch') return 0
  if (profile.handicap_range === '70s') return 5
  if (profile.handicap_range === '80s') return 15
  if (profile.handicap_range === '90s') return 25
  if (profile.handicap_range === 'beginner') return 36
  if (Number.isFinite(Number(profile.avg_score))) return Math.max(Number(profile.avg_score) - 72, 0)
  return 18
}

const sortWithRanks = (rows, direction = 'asc') => {
  const sorted = [...rows].sort((a, b) => {
    if (a.value === b.value) return getMemberName(a.member).localeCompare(getMemberName(b.member))
    return direction === 'asc' ? a.value - b.value : b.value - a.value
  })

  let previousValue = null
  let previousRank = 0
  return sorted.map((row, index) => {
    const rank = previousValue === row.value ? previousRank : index + 1
    previousValue = row.value
    previousRank = rank
    return { ...row, rank }
  })
}

export const calculateChallengeStandings = ({
  challenge,
  members = [],
  rounds = [],
  today = challenge?.created_at || new Date(),
}) => {
  if (!challenge) return []
  const memberIds = new Set(members.map(member => member.user_id))
  const thisWeekRounds = rounds.filter(round => (
    memberIds.has(round.user_id) && isThisWeek(round.date, today) && Number.isFinite(Number(round.score))
  ))
  const type = challenge.challenge_type || 'lowest_9'

  if (type === 'post_next_round') {
    const rows = members
      .map(member => {
        const memberRounds = thisWeekRounds.filter(round => round.user_id === member.user_id)
        if (!memberRounds.length) return null
        const firstRound = memberRounds.sort((a, b) => String(a.date).localeCompare(String(b.date)))[0]
        return {
          userId: member.user_id,
          member,
          value: 1,
          rank: 1,
          label: 'Posted',
          round: firstRound,
          challengeType: type,
        }
      })
      .filter(Boolean)
    return rows
  }

  if (type === 'most_rounds') {
    const rows = members
      .map(member => {
        const count = thisWeekRounds.filter(round => round.user_id === member.user_id).length
        if (!count) return null
        return {
          userId: member.user_id,
          member,
          value: count,
          label: `${count} round${count !== 1 ? 's' : ''}`,
          challengeType: type,
        }
      })
      .filter(Boolean)
    return sortWithRanks(rows, 'desc')
  }

  const targetHoles = type === 'lowest_9' ? 9 : 18
  const rows = members
    .map(member => {
      const scores = thisWeekRounds
        .filter(round => Number(round.holes || targetHoles) === targetHoles && Number.isFinite(Number(round.score)))
        .filter(round => round.user_id === member.user_id)
        .map(round => ({ ...round, score: Number(round.score) }))
      if (!scores.length) return null
      const bestRound = scores.sort((a, b) => a.score - b.score)[0]
      const value = type === 'best_net_score' ? Math.round((bestRound.score - estimateHandicap(member)) * 10) / 10 : bestRound.score
      return {
        userId: member.user_id,
        member,
        value,
        label: type === 'best_net_score' ? `Net ${value}` : `${bestRound.score}`,
        round: bestRound,
        challengeType: type,
      }
    })
    .filter(Boolean)

  return sortWithRanks(rows, 'asc')
}

export const calculatePointAwards = (standings = []) => (
  standings
    .map(row => {
      const placement = row.challengeType === 'post_next_round' ? 0 : ({ 1: 5, 2: 3, 3: 1 }[row.rank] || 0)
      const participation = 1
      const points = placement + participation
      return {
        userId: row.userId,
        member: row.member,
        rank: row.rank,
        points,
        reason: placement ? `#${row.rank} + participation` : 'Participation',
      }
    })
    .filter(row => row.points > 0)
)


export const calculateCrewPointTotals = (pointRows = []) => (
  pointRows.reduce((totals, row) => {
    if (!row?.crew_id || !row?.user_id) return totals
    const points = Number(row.points) || 0
    if (!totals[row.crew_id]) totals[row.crew_id] = { total: 0, byUser: {} }
    totals[row.crew_id].total += points
    totals[row.crew_id].byUser[row.user_id] = (totals[row.crew_id].byUser[row.user_id] || 0) + points
    return totals
  }, {})
)
