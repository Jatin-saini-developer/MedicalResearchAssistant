// Ranking pipeline — filters and scores all results
// Input: raw articles from PubMed + OpenAlex, trials from ClinicalTrials
// Output: top 6-8 most relevant results

const rankArticles = (articles, query, disease = '') => {
  if (!articles || articles.length === 0) return [];

  const queryWords = query.toLowerCase().split(' ').filter(Boolean);
  const diseaseWords = disease.toLowerCase().split(' ').filter(Boolean);
  const allKeywords = [...new Set([...queryWords, ...diseaseWords])];

  const scored = articles
    .filter(article => {
      // Remove articles with no useful content
      const hasTitle = article.title && article.title !== 'No title available';
      const hasAbstract = article.abstract && article.abstract !== 'No abstract available';
      return hasTitle && hasAbstract;
    })
    .map(article => {
      let score = 0;

      const titleLower = article.title.toLowerCase();
      const abstractLower = article.abstract.toLowerCase();

      // 1. Keyword relevance in title (high weight)
      allKeywords.forEach(keyword => {
        if (titleLower.includes(keyword)) score += 10;
        if (abstractLower.includes(keyword)) score += 3;
      });

      // 2. Recency score (newer = better)
      const year = parseInt(article.year);
      if (!isNaN(year)) {
        if (year >= 2023) score += 15;
        else if (year >= 2021) score += 10;
        else if (year >= 2019) score += 5;
        else if (year >= 2017) score += 2;
      }

      // 3. Source credibility
      if (article.source === 'PubMed') score += 8;
      if (article.source === 'OpenAlex') score += 5;

      // 4. Citation count bonus (OpenAlex provides this)
      if (article.citationCount) {
        if (article.citationCount > 100) score += 10;
        else if (article.citationCount > 50) score += 6;
        else if (article.citationCount > 10) score += 3;
      }

      // 5. Has authors (quality signal)
      if (article.authors && article.authors.length > 0) score += 2;

      // 6. Has valid URL
      if (article.url) score += 2;

      return { ...article, score };
    });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Remove duplicates by title similarity
  const seen = new Set();
  const deduplicated = scored.filter(article => {
    const titleKey = article.title.toLowerCase().slice(0, 50);
    if (seen.has(titleKey)) return false;
    seen.add(titleKey);
    return true;
  });

  // Return top 8
  return deduplicated.slice(0, 8);
};

const rankTrials = (trials, disease = '') => {
  if (!trials || trials.length === 0) return [];

  const diseaseWords = disease.toLowerCase().split(' ').filter(Boolean);

  const scored = trials
    .filter(trial => trial.title && trial.title !== 'No title available')
    .map(trial => {
      let score = 0;

      const titleLower = trial.title.toLowerCase();
      const descLower = (trial.description || '').toLowerCase();

      // 1. Disease keyword match
      diseaseWords.forEach(word => {
        if (titleLower.includes(word)) score += 10;
        if (descLower.includes(word)) score += 4;
      });

      // 2. Status scoring (recruiting trials are most useful)
      if (trial.status === 'RECRUITING') score += 15;
      else if (trial.status === 'ACTIVE_NOT_RECRUITING') score += 8;
      else if (trial.status === 'COMPLETED') score += 5;

      // 3. Has contact info
      if (trial.contact && trial.contact !== 'Not available') score += 3;

      // 4. Has location
      if (trial.locations && trial.locations[0] !== 'Location not specified') score += 3;

      // 5. Has URL
      if (trial.url) score += 2;

      return { ...trial, score };
    });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 6);
};

module.exports = { rankArticles, rankTrials };