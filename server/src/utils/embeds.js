import fetch from 'node-fetch';

// Extract URLs from text
export function extractUrls(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

// Fetch embed data from URL
export async function fetchEmbedData(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LightChat/1.0 (+https://lightchat.app)'
      },
      timeout: 5000
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract meta tags
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descriptionMatch = html.match(/<meta name="description" content="(.*?)"/i);
    const ogTitleMatch = html.match(/<meta property="og:title" content="(.*?)"/i);
    const ogDescriptionMatch = html.match(/<meta property="og:description" content="(.*?)"/i);
    const ogImageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);
    const ogTypeMatch = html.match(/<meta property="og:type" content="(.*?)"/i);
    const ogSiteNameMatch = html.match(/<meta property="og:site_name" content="(.*?)"/i);
    const twitterImageMatch = html.match(/<meta name="twitter:image" content="(.*?)"/i);

    const embed = {
      url,
      title: ogTitleMatch?.[1] || titleMatch?.[1] || '',
      description: ogDescriptionMatch?.[1] || descriptionMatch?.[1] || '',
      image: ogImageMatch?.[1] || twitterImageMatch?.[1] || '',
      type: ogTypeMatch?.[1] || 'website',
      siteName: ogSiteNameMatch?.[1] || '',
      color: null
    };

    // Set color based on type
    if (embed.type === 'video') {
      embed.color = '#ff0000';
    } else if (embed.type === 'music') {
      embed.color = '#1db954';
    } else {
      embed.color = '#5865f2';
    }

    // Only return if we have at least a title
    return embed.title ? embed : null;
  } catch (error) {
    console.error('Fetch embed error:', error);
    return null;
  }
}

// Generate embed HTML
export function generateEmbedHTML(embed) {
  if (!embed) return '';

  let html = '<div class="message-embed">';
  
  if (embed.siteName) {
    html += `<div class="embed-site-name">${embed.siteName}</div>`;
  }

  if (embed.title) {
    html += `<div class="embed-title"><a href="${embed.url}" target="_blank" rel="noopener noreferrer">${embed.title}</a></div>`;
  }

  if (embed.description) {
    html += `<div class="embed-description">${embed.description}</div>`;
  }

  if (embed.image) {
    html += `<div class="embed-image"><img src="${embed.image}" alt="" loading="lazy" /></div>`;
  }

  html += '</div>';

  return html;
}

// Process message and extract embeds
export async function processMessageEmbeds(content) {
  const urls = extractUrls(content);
  const embeds = [];

  for (const url of urls) {
    // Skip if URL is already an image
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      continue;
    }

    const embed = await fetchEmbedData(url);
    if (embed) {
      embeds.push(embed);
    }
  }

  return embeds;
}

// YouTube-specific embed
export function isYouTubeUrl(url) {
  return url.match(/(youtube\.com|youtu\.be)/);
}

export function getYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return match ? match[1] : null;
}

export function generateYouTubeEmbed(url) {
  const videoId = getYouTubeId(url);
  if (!videoId) return null;

  return {
    type: 'youtube',
    url,
    videoId,
    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    title: 'YouTube Video',
    color: '#ff0000'
  };
}

// Spotify embed
export function isSpotifyUrl(url) {
  return url.match(/spotify\.com/);
}

export function generateSpotifyEmbed(url) {
  const match = url.match(/spotify\.com\/(track|album|playlist)\/([^?]+)/);
  if (!match) return null;

  const [, type, id] = match;

  return {
    type: 'spotify',
    url,
    itemType: type,
    id,
    title: 'Spotify ' + type.charAt(0).toUpperCase() + type.slice(1),
    color: '#1db954'
  };
}

export default {
  extractUrls,
  fetchEmbedData,
  generateEmbedHTML,
  processMessageEmbeds,
  isYouTubeUrl,
  getYouTubeId,
  generateYouTubeEmbed,
  isSpotifyUrl,
  generateSpotifyEmbed
};
