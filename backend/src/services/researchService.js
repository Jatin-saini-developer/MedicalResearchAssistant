const { getPubMedArticles } = require('./pubmedService');
const { getOpenAlexArticles } = require('./openAlexService');
const { getClinicalTrials } = require('./clinicalTrialsService');
const { rankArticles, rankTrials } = require('./rankingService');
const { expandQuery } = require('../utils/queryExpander');

const conductResearch = async (query, disease = '', location = '') => {
  console.log('\n🚀 Starting research pipeline...');
  console.log(`Query: "${query}" | Disease: "${disease}"`);

  // Step 1: Expand the query
  const expandedQueries = expandQuery(query, disease, location);
  console.log(`📝 Expanded query: "${expandedQueries.expanded}"`);

  // Step 2: Fetch from all 3 sources in parallel
  console.log('\n📡 Fetching from all sources in parallel...');
  const [pubmedArticles, openAlexArticles, clinicalTrials] = await Promise.all([
    getPubMedArticles(expandedQueries.pubmedQuery, 100),
    getOpenAlexArticles(expandedQueries.openAlexQuery, 100),
    getClinicalTrials(expandedQueries.clinicalTrialsQuery, 50)
  ]);

  // Step 3: Combine publications
  const allArticles = [...pubmedArticles, ...openAlexArticles];
  console.log(`\n📚 Total raw articles: ${allArticles.length}`);
  console.log(`🧪 Total raw trials: ${clinicalTrials.length}`);

  // Step 4: Rank everything
  const topArticles = rankArticles(allArticles, expandedQueries.expanded, disease);
  const topTrials = rankTrials(clinicalTrials, disease);

  console.log(`\n✅ Top articles after ranking: ${topArticles.length}`);
  console.log(`✅ Top trials after ranking: ${topTrials.length}`);

  return {
    expandedQuery: expandedQueries.expanded,
    articles: topArticles,
    trials: topTrials,
    stats: {
      totalArticlesFetched: allArticles.length,
      totalTrialsFetched: clinicalTrials.length,
      articlesReturned: topArticles.length,
      trialsReturned: topTrials.length
    }
  };
};

module.exports = { conductResearch };