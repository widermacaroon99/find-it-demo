const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const Parser = require('rss-parser');

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(bodyParser.json());

// Set up OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set up RSS parser
const parser = new Parser();

// Your ScraperAPI key
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

// API endpoint
app.post('/api/request', async (req, res) => {
  const { message } = req.body;

  try {
    // Step 1: Extract keywords using OpenAI
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Extract simple search terms from user requests for items or services. Return 2-3 short, comma-separated keywords.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    let keywords = aiResponse.choices[0].message.content.trim();
    console.log('✅ AI extracted keywords:', keywords);

    keywords = keywords.replace(/^.*?(?=\b[a-z])/i, ''); // clean prefixes
    const searchTerm = encodeURIComponent(keywords.split(',')[0].trim());
    console.log('🔍 Using search term:', searchTerm);

    // Step 2: Use ScraperAPI to fetch Craigslist RSS
    const targetUrl = `https://calgary.craigslist.org/search/sss?format=rss&query=${searchTerm}`;
    const rssUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`;

    const feed = await parser.parseURL(rssUrl);

    const results = feed.items.slice(0, 5).map(item => ({
      title: item.title,
      description: item.contentSnippet,
      link: item.link,
    }));

    console.log(`✅ Found ${results.length} listings for "${searchTerm}"`);
    res.json({ results });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

