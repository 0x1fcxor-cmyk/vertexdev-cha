import express from 'express';
import AIChatbot from '../ai/chatbot.js';

const router = express.Router();
const chatbot = new AIChatbot();

// Process message with AI
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await chatbot.processMessage(message, context);
    
    res.json(result);
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to process AI chat' });
  }
});

// Get response suggestions
router.post('/suggest', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const suggestions = await chatbot.suggestResponse(message, context);
    
    res.json({ suggestions });
  } catch (error) {
    console.error('AI suggest error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Detect toxicity
router.post('/toxicity', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await chatbot.detectToxicity(message);
    
    res.json(result);
  } catch (error) {
    console.error('Toxicity detection error:', error);
    res.status(500).json({ error: 'Failed to detect toxicity' });
  }
});

// Summarize conversation
router.post('/summarize', async (req, res) => {
  try {
    const { messages, context } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const summary = await chatbot.summarizeConversation(messages, context);
    
    res.json({ summary });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: 'Failed to summarize conversation' });
  }
});

// Generate meeting agenda
router.post('/agenda', async (req, res) => {
  try {
    const { messages, context } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const agenda = await chatbot.generateMeetingAgenda(messages, context);
    
    res.json({ agenda });
  } catch (error) {
    console.error('Agenda generation error:', error);
    res.status(500).json({ error: 'Failed to generate meeting agenda' });
  }
});

// Clear conversation
router.post('/clear', async (req, res) => {
  try {
    const { userId, channelId } = req.body;
    
    chatbot.clearConversation(userId, channelId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({ error: 'Failed to clear conversation' });
  }
});

export default router;
