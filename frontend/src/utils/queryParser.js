/**
 * Complex Query Parser & Matcher for Frontend Job Filtering
 * Supports:
 * - Tag filters: company:Amazon, location:Bengaluru, skill:Python, status:Wishlist, min_score:85, growth:Stretch
 * - Boolean keywords: AND, OR, NOT, -keyword
 * - Quoted phrases: "Senior Engineer", "Full Stack"
 */

export function matchComplexJobQuery(job, queryString) {
  if (!queryString || !queryString.trim()) return true
  const q = queryString.trim()

  // 1. Tag filters extraction
  const tagPattern = /\b(company|location|skill|skills|status|role|growth|min_score):("[^"]+"|\S+)/gi
  let remaining = q
  let matchesTags = true

  let match
  while ((match = tagPattern.exec(q)) !== null) {
    const key = match[1].toLowerCase()
    const val = match[2].replace(/^["']|["']$/g, '').toLowerCase()

    if (key === 'company') {
      if (!(job.company || '').toLowerCase().includes(val)) matchesTags = false
    } else if (key === 'location') {
      if (!(job.location || '').toLowerCase().includes(val)) matchesTags = false
    } else if (key === 'skill' || key === 'skills') {
      const skillsArr = Array.isArray(job.skills) ? job.skills : []
      const joined = skillsArr.join(' ').toLowerCase()
      if (!joined.includes(val)) matchesTags = false
    } else if (key === 'status') {
      if ((job.status || 'Wishlist').toLowerCase() !== val) matchesTags = false
    } else if (key === 'growth') {
      if (!(job.growth_level || '').toLowerCase().includes(val)) matchesTags = false
    } else if (key === 'min_score') {
      const minVal = parseFloat(val)
      if (!isNaN(minVal) && (parseFloat(job.match_score) || 0) < minVal) matchesTags = false
    }
  }

  if (!matchesTags) return false

  // Remove tag filters to process remaining text
  remaining = remaining.replace(tagPattern, '').trim()
  if (!remaining) return true

  // Quoted phrases
  const phrases = []
  const phrasePattern = /"([^"]+)"/g
  let pMatch
  while ((pMatch = phrasePattern.exec(remaining)) !== null) {
    phrases.push(pMatch[1].toLowerCase())
  }
  const unquoted = remaining.replace(phrasePattern, ' ').trim()

  // Build searchable text corpus for the job
  const jobCorpus = [
    job.title || '',
    job.company || '',
    job.location || '',
    job.description || '',
    Array.isArray(job.skills) ? job.skills.join(' ') : (job.skills || ''),
    job.growth_level || '',
    job.status || '',
  ].join(' ').toLowerCase()

  // Check quoted phrases
  for (const phrase of phrases) {
    if (!jobCorpus.includes(phrase)) return false
  }

  // Tokenize boolean words
  const tokens = unquoted.split(/\s+/).filter(Boolean)
  let isNot = false

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const upper = token.toUpperCase()

    if (upper === 'AND' || upper === 'OR') {
      continue
    } else if (upper === 'NOT' || token.startsWith('-')) {
      isNot = true
      const word = token.startsWith('-') ? token.slice(1).toLowerCase() : ''
      if (word && jobCorpus.includes(word)) {
        return false
      }
      continue
    } else {
      const word = token.toLowerCase()
      if (isNot) {
        if (jobCorpus.includes(word)) return false
        isNot = false
      } else {
        if (!jobCorpus.includes(word)) return false
      }
    }
  }

  return true
}
