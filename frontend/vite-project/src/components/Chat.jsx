import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import './Chat.css';

const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [showContext, setShowContext] = useState(false);
  const [context, setContext] = useState({
    patientName: '',
    disease: '',
    location: ''
  });
  const [articles, setArticles] = useState([]);
  const [trials, setTrials] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `## Welcome to Medical Research Assistant 👋

I can help you find:
- Latest research publications
- Ongoing clinical trials
- Evidence-based treatment insights

**To get started**, you can:
- Type a question like *"Latest treatment for lung cancer"*
- Or set your medical context using the **Set Context** button above

*I use real data from PubMed, OpenAlex, and ClinicalTrials.gov*`
    }]);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: userMessage,
        sessionId,
        patientName: context.patientName,
        disease: context.disease,
        location: context.location
      });

      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response
      }]);

      // Update articles and trials
      setArticles(response.data.articles || []);
      setTrials(response.data.trials || []);

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Something went wrong. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <span className="header-icon">🧬</span>
          <div>
            <h1>Medical Research Assistant</h1>
            <p>Powered by PubMed · OpenAlex · ClinicalTrials · Llama 3</p>
          </div>
        </div>
        <button
          className="context-btn"
          onClick={() => setShowContext(!showContext)}
        >
          {showContext ? 'Hide Context' : '⚙️ Set Context'}
        </button>
      </div>

      {/* Context Panel */}
      {showContext && (
        <div className="context-panel">
          <h3>Patient Context</h3>
          <div className="context-fields">
            <input
              type="text"
              placeholder="Patient Name"
              value={context.patientName}
              onChange={e => setContext({ ...context, patientName: e.target.value })}
            />
            <input
              type="text"
              placeholder="Disease / Condition"
              value={context.disease}
              onChange={e => setContext({ ...context, disease: e.target.value })}
            />
            <input
              type="text"
              placeholder="Location (optional)"
              value={context.location}
              onChange={e => setContext({ ...context, location: e.target.value })}
            />
          </div>
          {context.disease && (
            <p className="context-active">
              ✅ Context active: <strong>{context.disease}</strong>
              {context.patientName && ` for ${context.patientName}`}
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Chat
        </button>
        <button
          className={`tab ${activeTab === 'publications' ? 'active' : ''}`}
          onClick={() => setActiveTab('publications')}
        >
          📚 Publications {articles.length > 0 && `(${articles.length})`}
        </button>
        <button
          className={`tab ${activeTab === 'trials' ? 'active' : ''}`}
          onClick={() => setActiveTab('trials')}
        >
          🧪 Clinical Trials {trials.length > 0 && `(${trials.length})`}
        </button>
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <>
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? '👤' : '🧬'}
                </div>
                <div className="message-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message assistant">
                <div className="message-avatar">🧬</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                    <p>Searching PubMed, OpenAlex, ClinicalTrials...</p>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="input-area">
            <div className="quick-queries">
              {['Latest treatment for lung cancer',
                'Clinical trials for diabetes',
                'Alzheimer\'s disease research'].map(q => (
                <button
                  key={q}
                  className="quick-btn"
                  onClick={() => setInput(q)}
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="input-row">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about any medical condition, treatment, or research..."
                rows={2}
                disabled={loading}
              />
              <button
                className="send-btn"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
              >
                {loading ? '⏳' : '➤'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Publications Tab */}
      {activeTab === 'publications' && (
        <div className="results-container">
          {articles.length === 0 ? (
            <div className="empty-state">
              <p>💬 Ask a question in the chat to see publications here</p>
            </div>
          ) : (
            articles.map((article, index) => (
              <div key={index} className="result-card">
                <div className="result-header">
                  <span className="source-badge">{article.source}</span>
                  <span className="year-badge">{article.year}</span>
                </div>
                <h3>{article.title}</h3>
                <p className="authors">
                  👥 {article.authors?.join(', ') || 'Authors not available'}
                </p>
                <p className="abstract">
                  {article.abstract?.slice(0, 250)}...
                </p>
                {article.url && (
                  <a href={article.url} target="_blank" rel="noreferrer" className="read-more">
                    Read Full Paper →
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Clinical Trials Tab */}
      {activeTab === 'trials' && (
        <div className="results-container">
          {trials.length === 0 ? (
            <div className="empty-state">
              <p>💬 Ask a question in the chat to see clinical trials here</p>
            </div>
          ) : (
            trials.map((trial, index) => (
              <div key={index} className="result-card">
                <div className="result-header">
                  <span className={`status-badge ${trial.status?.toLowerCase()}`}>
                    {trial.status}
                  </span>
                </div>
                <h3>{trial.title}</h3>
                <p className="trial-desc">
                  {trial.description?.slice(0, 200)}...
                </p>
                <div className="trial-meta">
                  <span>📍 {trial.locations?.[0]}</span>
                  <span>📞 {trial.contact}</span>
                </div>
                {trial.url && (
                  <a href={trial.url} target="_blank" rel="noreferrer" className="read-more">
                    View Trial Details →
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Chat;