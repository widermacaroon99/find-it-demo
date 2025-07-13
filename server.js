const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const Parser = require('rss-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const parser = new Parser();
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

app.post('/api/request', async (req, res) => {
  const { message } = req.body;

  try {
    const aiRes = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Extract 2‑3 short comma‑separated search keywords.' },
        { role: 'user', content: message }
      ],
    });

    const keywords = aiRes.choices[0].message.content.trim();
    console.log('✅ AI extracted keywords:', keywords);

    const term = encodeURIComponent(keywords.split(',')[0].trim());
    console.log('🔍 Using search term:', term);

    const target = `https://calgary.craigslist.org/search/sss?format=rss&query=${term}`;
    const rssUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&premium=true&url=${encodeURIComponent(target)}`;
    console.log('🔗 Fetching RSS feed via ScraperAPI:', rssUrl);

    const response = await axios.get(rssUrl);
    if (response.status !== 200 || !response.data.includes('<?xml')) {
      throw new Error(`Bad ScraperAPI response (status ${response.status})`);
    }

    const feed = await parser.parseString(response.data);
    const results = feed.items.slice(0, 5).map(item => ({
      title: item.title,
      description: item.contentSnippet,
      link: item.link
    }));

    console.log(`✅ Found ${results.length} Craigslist listings.`);
    res.json({ results });

  } catch (err) {
    console.error('❌ FULL ERROR:', err);
    res.status(500).json({ error: 'Scraping failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
