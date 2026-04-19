const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Conversation = require('./models/Conversation');
const { getPubMedArticles } = require('./services/pubmedService');
const { conductResearch } = require('./services/researchService');
const { generateMedicalResponse } = require('./services/llmService');
const chatRoutes = require('./routes/chatRoutes');



const app = express();

// Middlewares
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://medical-research-assistant-phi.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

app.use('/api', chatRoutes);


app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.get('/test-pubmed', async (req, res) => {
  const results = await getPubMedArticles('lung cancer treatment');
  res.json({ count: results.length, sample: results[0] });
});

app.get('/test-llm', async (req, res) => {
  const mockArticles = [{
    title: 'Deep Brain Stimulation for Parkinson Disease',
    authors: ['Smith J', 'Doe A'],
    year: '2023',
    source: 'PubMed',
    abstract: 'Deep brain stimulation has shown significant improvement in motor symptoms of Parkinson disease patients in multiple clinical studies.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/123'
  }];

  const mockTrials = [{
    title: 'DBS Trial for Advanced Parkinson',
    status: 'RECRUITING',
    description: 'Testing new DBS parameters',
    locations: ['Toronto, Canada'],
    contact: 'Dr. Smith - smith@hospital.com',
    url: 'https://clinicaltrials.gov/study/NCT123'
  }];

  const response = await generateMedicalResponse(
    'deep brain stimulation',
    "Parkinson's disease",
    mockArticles,
    mockTrials,
    []
  );

  res.json({ response });
});

app.get('/test-pipeline', async (req, res) => {
  const results = await conductResearch('deep brain stimulation', 'Parkinson\'s disease');
  res.json(results);
});
// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medical-assistant';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
  });

// app.listen(5000)