export const average = (values = []) => {
  const scores = values.map(Number).filter(Number.isFinite)
  if (!scores.length) return null
  return Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10
}

export const estimateHandicapFromAverages = ({ avg18, avg9 } = {}) => {
  if (Number.isFinite(Number(avg18))) return Math.max(Math.round((Number(avg18) - 72) * 10) / 10, 0)
  if (Number.isFinite(Number(avg9))) return Math.max(Math.round(((Number(avg9) * 2) - 72) * 10) / 10, 0)
  return null
}

export const calculateRoundStats = (rounds = []) => {
  const validRounds = rounds.filter(round => Number.isFinite(Number(round?.score)))
  const rounds9 = validRounds.filter(round => Number(round.holes) === 9)
  const rounds18 = validRounds.filter(round => Number(round.holes || 18) === 18)
  const scores9 = rounds9.map(round => Number(round.score))
  const scores18 = rounds18.map(round => Number(round.score))
  const allScores = validRounds.map(round => Number(round.score))
  const avg9 = average(scores9)
  const avg18 = average(scores18)

  return {
    count: validRounds.length,
    count9: rounds9.length,
    count18: rounds18.length,
    avg9,
    avg18,
    best9: scores9.length ? Math.min(...scores9) : null,
    best18: scores18.length ? Math.min(...scores18) : null,
    best: allScores.length ? Math.min(...allScores) : null,
    handicapEstimate: estimateHandicapFromAverages({ avg18, avg9 }),
  }
}

export const getProfileAverageScore = (rounds = []) => {
  const stats = calculateRoundStats(rounds)
  if (stats.avg18 != null) return stats.avg18
  if (stats.avg9 != null) return Math.round((stats.avg9 * 2) * 10) / 10
  return null
}
