import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// AI Chatbot system
export class AIChatbot {
  constructor(systemPrompt = 'You are a helpful assistant for LightChat, a Discord-like chat application.') {
    this.systemPrompt = systemPrompt;
    this.conversationHistory = new Map(); // Store conversation history per user/channel
  }

  async processMessage(message, context = {}) {
    const { userId, channelId, serverId, username } = context;
    const key = `${userId}-${channelId}`;
    
    // Get conversation history
    const history = this.conversationHistory.get(key) || [];
    
    // Add system prompt if no history
    if (history.length === 0) {
      history.push({ role: 'system', content: this.systemPrompt });
    }
    
    // Add user message
    history.push({ role: 'user', content: message });
    
    // Keep last 10 messages to stay within token limits
    const recentHistory = history.slice(-10);
    
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: recentHistory,
        max_tokens: 500,
        temperature: 0.7
      });
      
      const aiResponse = completion.choices[0].message.content;
      
      // Add AI response to history
      history.push({ role: 'assistant', content: aiResponse });
      
      // Update conversation history
      this.conversationHistory.set(key, history);
      
      return {
        response: aiResponse,
        confidence: completion.choices[0].finish_reason === 'stop' ? 1.0 : 0.5,
        model: completion.model
      };
    } catch (error) {
      console.error('AI Chatbot error:', error);
      
      // Fallback responses
      const fallbacks = [
        "I'm having trouble connecting to my AI brain right now. Try again later!",
        "My neural networks are taking a break. What else can I help you with?",
        "I'm experiencing some technical difficulties. Let's try a different topic."
      ];
      
      return {
        response: fallbacks[Math.floor(Math.random() * fallbacks.length)],
        confidence: 0.1,
        error: true
      };
    }
  }

  async suggestResponse(message, context = {}) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that suggests responses to messages. Provide 3 different response suggestions that are natural and conversational.' },
          { role: 'user', content: `Suggest 3 responses to this message: "${message}"` }
        ],
        max_tokens: 200,
        temperature: 0.8
      });
      
      const suggestions = completion.choices[0].message.content
        .split('\n')
        .filter(s => s.trim())
        .slice(0, 3);
      
      return suggestions;
    } catch (error) {
      return [];
    }
  }

  async detectToxicity(message) {
    try {
      const completion = await openai.moderations.create({
        input: message
      });
      
      const result = completion.results[0];
      
      return {
        flagged: result.flagged,
        categories: result.categories,
        scores: result.category_scores
      };
    } catch (error) {
      console.error('Toxicity detection error:', error);
      return { flagged: false, categories: {}, scores: {} };
    }
  }

  async summarizeConversation(messages, context = {}) {
    try {
      const messageText = messages.map(m => `${m.username}: ${m.content}`).join('\n');
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Summarize the conversation in 2-3 sentences, highlighting key points and decisions made.' },
          { role: 'user', content: messageText }
        ],
        max_tokens: 150,
        temperature: 0.5
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      return 'Unable to summarize conversation at this time.';
    }
  }

  async generateMeetingAgenda(messages, context = {}) {
    try {
      const messageText = messages.map(m => `${m.username}: ${m.content}`).join('\n');
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Generate a meeting agenda based on the conversation. List topics discussed and action items.' },
          { role: 'user', content: messageText }
        ],
        max_tokens: 300,
        temperature: 0.5
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      return 'Unable to generate meeting agenda at this time.';
    }
  }

  clearConversation(userId, channelId) {
    const key = `${userId}-${channelId}`;
    this.conversationHistory.delete(key);
  }
}

export default AIChatbot;
