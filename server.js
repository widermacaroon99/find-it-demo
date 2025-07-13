const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const Parser = require('rss-parser');
const axios = require('axios'); // ✅ For safer RSS fetching

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(bodyParser.json());

// ✅ OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ RSS and API keys
const parser = new Parser();
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

app.post('/api/request', async (req, res) => {
  const { message } = req.body;

  try {
    // 🔍 Extract keywords using OpenAI
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

    const keywords = aiResponse.choices[0].message.content.trim();
    console.log('✅ AI extracted keywords:', keywords);

    const searchTerm = encodeURIComponent(keywords.split(',')[0].trim());
    console.log('🔍 Using search term:', searchTerm);

    // 🌐 Build and call ScraperAPI RSS URL
    const targetUrl = `https://calgary.craigslist.org/search/sss?format=rss&query=${searchTerm}`;
    const rssUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`;

    console.log('🔗 Fetching RSS feed via ScraperAPI:', rssUrl);

    // 🛡️ Fetch and validate response before parsing
    const response = await axios.get(rssUrl);

    if (response.status !== 200 || !response.data.includes('<?xml')) {
      throw new Error(`Unexpected response from ScraperAPI. Status: ${response.status}`);
    }

    // 📥 Parse valid XML feed
    const feed = await parser.parseString(response.data);

    const results = feed.items.slice(0, 5).map(item => ({
      title: item.title,
      description: item.contentSnippet,
      link: item.link,
    }));

    console.log(`✅ Found ${results.length} listings for "${searchTerm}"`);
    res.json({ results });

  } catch (error) {
    console.error('❌ FULL ERROR:', error);
    res.status(500).json({ error: 'Scraping failed.', details: error.message });
  }
});

// 🚀 Launch server using Render's provided port
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
