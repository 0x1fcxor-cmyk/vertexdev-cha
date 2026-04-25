import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

// Configure marked for Discord-like markdown
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

// Configure sanitize-html to allow safe HTML
const sanitizeOptions = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'blockquote',
    'p', 'br', 'span', 'div', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target'],
    'code': ['class'],
    'span': ['class', 'data-mention'],
    'div': ['class', 'data-spoiler'],
    'pre': ['class']
  },
  allowedSchemes: ['http', 'https', 'ftp'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'ftp']
  },
  selfClosing: ['br']
};

export function parseMarkdown(text) {
  if (!text) return '';
  
  // Process @everyone and @here mentions
  text = processSpecialMentions(text);
  
  // Process spoiler tags
  text = processSpoilers(text);
  
  // Process quotes
  text = processQuotes(text);
  
  // Parse markdown to HTML
  const html = marked.parse(text);
  
  // Sanitize HTML to prevent XSS
  const sanitized = sanitizeHtml(html, sanitizeOptions);
  
  return sanitized;
}

export function processSpecialMentions(text) {
  // @everyone mention
  text = text.replace(/@everyone/g, '<span class="mention mention-everyone" data-mention="everyone">@everyone</span>');
  
  // @here mention
  text = text.replace(/@here/g, '<span class="mention mention-here" data-mention="here">@here</span>');
  
  return text;
}

export function processQuotes(text) {
  // Quote format: > quoted text
  text = text.replace(/^> (.+)$/gm, '<blockquote class="quote">$1</blockquote>');
  return text;
}

export function processSpoilers(text) {
  // Spoiler tags: ||spoiler text||
  text = text.replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler" data-spoiler="true">$1</span>');
  return text;
}

export function extractMentions(text) {
  const mentions = [];
  
  // @everyone
  if (text.includes('@everyone')) {
    mentions.push({ type: 'everyone', id: 'everyone' });
  }
  
  // @here
  if (text.includes('@here')) {
    mentions.push({ type: 'here', id: 'here' });
  }
  
  // User mentions @username
  const userMentionRegex = /@(\w{3,20})/g;
  let match;
  while ((match = userMentionRegex.exec(text)) !== null) {
    mentions.push({ type: 'user', name: match[1] });
  }
  
  return mentions;
}

export function extractEmojis(text) {
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
  const emojis = [];
  let match;
  
  while ((match = emojiRegex.exec(text)) !== null) {
    emojis.push(match[0]);
  }
  
  return emojis;
}

export function processMessageContent(content) {
  return {
    html: parseMarkdown(content),
    mentions: extractMentions(content),
    emojis: extractEmojis(content)
  };
}
