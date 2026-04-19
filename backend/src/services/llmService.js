const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const MODEL_NAME = 'llama-3.3-70b-versatile';

const generateMedicalResponse = async (query, disease, articles, trials, conversationHistory = []) => {
  console.log('\n🤖 Sending to Groq LLM...');

  // Build context from articles
  const articlesContext = articles.map((article, index) => `
[Publication ${index + 1}]
Title: ${article.title}
Authors: ${article.authors?.join(', ') || 'N/A'}
Year: ${article.year}
Source: ${article.source}
Abstract: ${article.abstract?.slice(0, 300)}...
URL: ${article.url}
`).join('\n');

  // Build context from trials
  const trialsContext = trials.map((trial, index) => `
[Clinical Trial ${index + 1}]
Title: ${trial.title}
Status: ${trial.status}
Description: ${trial.description?.slice(0, 200)}...
Locations: ${trial.locations?.join(', ')}
Contact: ${trial.contact}
URL: ${trial.url}
`).join('\n');

  // Build conversation history for multi-turn
  const historyMessages = conversationHistory
    .slice(-4) // last 4 messages only
    .map(m => ({
      role: m.role,
      content: m.content
    }));

  // System prompt
  const systemPrompt = `You are an expert medical research assistant. Your job is to provide structured, accurate, research-backed answers based ONLY on the provided research data. 
  
Rules:
- Never hallucinate or add information not present in the sources
- Always cite the source publications
- Be precise, helpful and empathetic
- Structure your response exactly as instructed
- If no relevant data found, say so honestly`;

  // User prompt with all research data
  const userPrompt = `Query: "${query}"
${disease ? `Disease Context: ${disease}` : ''}

RESEARCH PUBLICATIONS:
${articlesContext || 'No publications found.'}

CLINICAL TRIALS:
${trialsContext || 'No clinical trials found.'}

Based ONLY on the research data above, provide a response in EXACTLY this format:

## Condition Overview
[2-3 sentences explaining the condition/topic based on the research]

## Research Insights
[4-5 key insights from the publications, each referencing the source]
- Insight (Source: Publication Title, Year)

## Clinical Trials
[List relevant trials]
- Trial Name | Status | Location

## Key Takeaways
[2-3 practical takeaways based purely on the research]

## Sources
[List all publications]
1. Title | Authors | Year | Source | URL`;

  try {
    const response = await groq.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    console.log('✅ Groq response received');
    return response.choices[0]?.message?.content || 'No response generated';

  } catch (error) {
    console.error('❌ Groq LLM error:', error.message);
    return generateFallbackResponse(query, disease, articles, trials);
  }
};

// Fallback if Groq fails
const generateFallbackResponse = (query, disease, articles, trials) => {
  return `
## Condition Overview
Based on available research for "${query}"${disease ? ` related to ${disease}` : ''}.

## Research Insights
${articles.slice(0, 3).map(a =>
  `- ${a.title} (${a.year}) - ${a.abstract?.slice(0, 150)}...`
).join('\n')}

## Clinical Trials
${trials.length > 0
  ? trials.slice(0, 3).map(t =>
      `- ${t.title} | ${t.status} | ${t.locations?.[0]}`
    ).join('\n')
  : 'No clinical trials found.'}

## Sources
${articles.map((a, i) =>
  `${i + 1}. ${a.title} | ${a.authors?.slice(0, 2).join(', ')} | ${a.year} | ${a.source} | ${a.url}`
).join('\n')}
  `;
};

module.exports = { generateMedicalResponse };