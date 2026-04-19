const axios = require('axios');

const OPENALEX_BASE = 'https://api.openalex.org/works';

const getOpenAlexArticles = async (query, maxResults = 100) => {
  console.log(`🔍 OpenAlex searching: "${query}"`);
  try {
    const allResults = [];

    // Fetch 2 pages (50 each = 100 results)
    for (let page = 1; page <= 2; page++) {
      const response = await axios.get(OPENALEX_BASE, {
        params: {
          search: query,
          'per-page': 50,
          page,
          sort: 'relevance_score:desc',
          filter: 'from_publication_date:2018-01-01'
        }
      });

      const results = response.data?.results || [];
      if (results.length === 0) break;

      const articles = results.map(work => {
        // Extract authors
        const authors = (work.authorships || [])
          .slice(0, 5)
          .map(a => a?.author?.display_name || '')
          .filter(Boolean);

        // Extract abstract (OpenAlex stores it as inverted index)
        let abstract = 'No abstract available';
        if (work.abstract_inverted_index) {
          try {
            const wordPositions = work.abstract_inverted_index;
            const words = [];
            for (const [word, positions] of Object.entries(wordPositions)) {
              positions.forEach(pos => { words[pos] = word; });
            }
            abstract = words.filter(Boolean).join(' ');
          } catch {
            abstract = 'No abstract available';
          }
        }

        return {
          title: work.title || 'No title available',
          abstract,
          authors,
          year: work.publication_year || 'N/A',
          source: 'OpenAlex',
          url: work.primary_location?.landing_page_url || work.id || '',
          citationCount: work.cited_by_count || 0
        };
      });

      allResults.push(...articles);
    }

    console.log(`✅ OpenAlex fetched ${allResults.length} articles`);
    return allResults;

  } catch (error) {
    console.error('OpenAlex error:', error.message);
    return [];
  }
};

module.exports = { getOpenAlexArticles };