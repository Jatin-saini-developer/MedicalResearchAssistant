const axios = require('axios');

const CLINICAL_TRIALS_BASE = 'https://clinicaltrials.gov/api/v2/studies';

const getClinicalTrials = async (disease, maxResults = 50) => {
  console.log(`🔍 ClinicalTrials searching: "${disease}"`);
  try {
    const response = await axios.get(CLINICAL_TRIALS_BASE, {
      params: {
        'query.cond': disease,
        'filter.overallStatus': 'RECRUITING,COMPLETED,ACTIVE_NOT_RECRUITING',
        pageSize: maxResults,
        format: 'json'
      }
    });

    const studies = response.data?.studies || [];

    const trials = studies.map(study => {
      const proto = study?.protocolSection;
      const id = proto?.identificationModule;
      const status = proto?.statusModule;
      const desc = proto?.descriptionModule;
      const eligibility = proto?.eligibilityModule;
      const contacts = proto?.contactsLocationsModule;

      // Extract locations
      const locations = (contacts?.locations || [])
        .slice(0, 3)
        .map(loc => `${loc.city || ''}, ${loc.country || ''}`.trim())
        .filter(l => l !== ',');

      // Extract contact info
      const centralContacts = contacts?.centralContacts || [];
      const contact = centralContacts[0]
        ? `${centralContacts[0].name || ''} - ${centralContacts[0].phone || centralContacts[0].email || ''}`
        : 'Not available';

      return {
        title: id?.briefTitle || 'No title available',
        status: status?.overallStatus || 'Unknown',
        description: desc?.briefSummary || 'No description available',
        eligibility: eligibility?.eligibilityCriteria || 'Not specified',
        locations: locations.length > 0 ? locations : ['Location not specified'],
        contact,
        nctId: id?.nctId || '',
        url: id?.nctId ? `https://clinicaltrials.gov/study/${id.nctId}` : ''
      };
    });

    console.log(`✅ ClinicalTrials fetched ${trials.length} trials`);
    return trials;

  } catch (error) {
    console.error('ClinicalTrials error:', error.message);
    return [];
  }
};

module.exports = { getClinicalTrials };