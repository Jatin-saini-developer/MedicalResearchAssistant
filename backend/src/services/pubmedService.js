const axios = require('axios');
const xml2js = require('xml2js');

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

// Step 1: Search PubMed and get article IDs
const searchPubMed = async (query, maxResults = 100) => {
  try {
    const response = await axios.get(`${PUBMED_BASE}/esearch.fcgi`, {
      params: {
        db: 'pubmed',
        term: query,
        retmax: maxResults,
        sort: 'pub date',
        retmode: 'json'
      }
    });
    return response.data.esearchresult.idlist || [];
  } catch (error) {
    console.error('PubMed search error:', error.message);
    return [];
  }
};

// Step 2: Fetch full details for those IDs
const fetchPubMedDetails = async (ids) => {
  if (!ids || ids.length === 0) return [];

  try {
    const response = await axios.get(`${PUBMED_BASE}/efetch.fcgi`, {
      params: {
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'xml'
      }
    });

    // Convert XML to JSON
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);

    const articles = result?.PubmedArticleSet?.PubmedArticle;
    if (!articles) return [];

    // Handle both single article and array of articles
    const articleArray = Array.isArray(articles) ? articles : [articles];

    return articleArray.map(article => {
      const medline = article?.MedlineCitation;
      const articleData = medline?.Article;

      // Extract authors
      const authorList = articleData?.AuthorList?.Author;
      let authors = [];
      if (authorList) {
        const authorArray = Array.isArray(authorList) ? authorList : [authorList];
        authors = authorArray
          .map(a => `${a.LastName || ''} ${a.ForeName || ''}`.trim())
          .filter(Boolean)
          .slice(0, 5); // max 5 authors
      }

      // Extract abstract
      const abstractData = articleData?.Abstract?.AbstractText;
      let abstract = '';
      if (typeof abstractData === 'string') {
        abstract = abstractData;
      } else if (Array.isArray(abstractData)) {
        abstract = abstractData.map(a => (typeof a === 'string' ? a : a._ || '')).join(' ');
      } else if (abstractData?._) {
        abstract = abstractData._;
      }

      const pmid = medline?.PMID?._ || medline?.PMID || '';

      return {
        title: articleData?.ArticleTitle || 'No title available',
        abstract: abstract || 'No abstract available',
        authors,
        year: medline?.DateCompleted?.Year ||
              articleData?.Journal?.JournalIssue?.PubDate?.Year || 'N/A',
        source: 'PubMed',
        url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '',
        pmid
      };
    });

  } catch (error) {
    console.error('PubMed fetch error:', error.message);
    return [];
  }
};

// Main function — search + fetch combined
const getPubMedArticles = async (query, maxResults = 100) => {
  console.log(`🔍 PubMed searching: "${query}"`);
  const ids = await searchPubMed(query, maxResults);
  console.log(`📄 PubMed found ${ids.length} IDs`);
  if (ids.length === 0) return [];
  const articles = await fetchPubMedDetails(ids.slice(0, 50)); // fetch top 50
  console.log(`✅ PubMed fetched ${articles.length} articles`);
  return articles;
};

module.exports = { getPubMedArticles };