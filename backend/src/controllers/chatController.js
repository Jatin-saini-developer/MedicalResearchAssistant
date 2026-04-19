const { conductResearch } = require('../services/researchService');
const { generateMedicalResponse } = require('../services/llmService');
const Conversation = require('../models/Conversation');
const { v4: uuidv4 } = require('uuid');

const chat = async (req, res) => {
  try {
    const {
      message,
      sessionId,
      patientName = '',
      disease = '',
      location = ''
    } = req.body;

    // Validate input
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Step 1: Find or create conversation session
    let conversation;
    if (sessionId) {
      conversation = await Conversation.findOne({ sessionId });
    }

    if (!conversation) {
      conversation = new Conversation({
        sessionId: sessionId || uuidv4(),
        userContext: { patientName, disease, location },
        messages: []
      });
    }

    // Update context if provided
    if (disease) conversation.userContext.disease = disease;
    if (location) conversation.userContext.location = location;
    if (patientName) conversation.userContext.patientName = patientName;

    // Step 2: Get disease context from conversation
    const diseaseContext = conversation.userContext.disease || disease || '';

    // Step 3: Add user message to history
    conversation.messages.push({
      role: 'user',
      content: message
    });

    // Step 4: Run the full research pipeline
    console.log('\n=============================');
    console.log(`💬 User: ${message}`);
    console.log(`🏥 Disease Context: ${diseaseContext}`);
    console.log('=============================');

    const researchResults = await conductResearch(message, diseaseContext, location);

    // Step 5: Generate LLM response
    const llmResponse = await generateMedicalResponse(
      message,
      diseaseContext,
      researchResults.articles,
      researchResults.trials,
      conversation.messages.slice(-6) // pass last 6 messages as history
    );

    // Step 6: Save assistant response to history
    conversation.messages.push({
      role: 'assistant',
      content: llmResponse
    });

    // Step 7: Save conversation to MongoDB
    await conversation.save();

    // Step 8: Send response
    res.json({
      sessionId: conversation.sessionId,
      response: llmResponse,
      articles: researchResults.articles,
      trials: researchResults.trials,
      stats: researchResults.stats,
      context: conversation.userContext
    });

  } catch (error) {
    console.error('❌ Chat controller error:', error.message);
    res.status(500).json({ error: 'Something went wrong', details: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const conversation = await Conversation.findOne({ sessionId });

    if (!conversation) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: conversation.sessionId,
      context: conversation.userContext,
      messages: conversation.messages
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

module.exports = { chat, getHistory };