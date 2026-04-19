// Expands a basic query into a richer search query
// by combining it with disease context

const expandQuery = (query, disease = '', location = '') => {
  let expandedQuery = query.trim();

  // If disease context exists and isn't already in the query, add it
  if (disease && !expandedQuery.toLowerCase().includes(disease.toLowerCase())) {
    expandedQuery = `${expandedQuery} ${disease}`;
  }

  // Clean up extra spaces
  expandedQuery = expandedQuery.replace(/\s+/g, ' ').trim();

  // Build variations for different APIs
  const pubmedQuery = expandedQuery.replace(/\s+/g, '+');
  const openAlexQuery = expandedQuery.replace(/\s+/g, '+');
  const clinicalTrialsQuery = disease || expandedQuery;

  return {
    original: query,
    expanded: expandedQuery,
    pubmedQuery,
    openAlexQuery,
    clinicalTrialsQuery
  };
};

module.exports = { expandQuery };