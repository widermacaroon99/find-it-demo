const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const RSSParser = require('rss-parser');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const parser = new RSSParser();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.post('/api/request', async (req, res) => {
  const userPrompt = req.body.prompt;
  console.log('🧠 User Prompt:', userPrompt);

  try {
    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Extract 2-5 keyword search terms that would be useful for searching local buy/sell sites. No explanation needed.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const keywords = aiResponse.data.choices[0].message.content.trim();
    console.log('✅ AI extracted keywords:', keywords);

    const searchTerm = encodeURIComponent(keywords.split(',')[0].trim());
    console.log('🔍 Using search term:', searchTerm);

    const scraperApiKey = process.env.SCRAPER_API_KEY;
    const craigslistUrl = `https://calgary.craigslist.org/search/sss?format=rss&query=${searchTerm}`;
    const scraperUrl = `https://api.scraperapi.com?api_key=${scraperApiKey}&premium=true&url=${encodeURIComponent(craigslistUrl)}`;

    let feed;
    try {
      const response = await axios.get(scraperUrl);
      feed = await parser.parseString(response.data);
    } catch (error) {
      console.error('⚠️ Premium failed, trying ultra_premium');
      const fallbackUrl = `https://api.scraperapi.com?api_key=${scraperApiKey}&ultra_premium=true&url=${encodeURIComponent(craigslistUrl)}`;
      try {
        const response = await axios.get(fallbackUrl);
        feed = await parser.parseString(response.data);
      } catch (err) {
        console.error('❌ FULL ERROR:', err);
        return res.status(500).json({ error: 'Failed to fetch or parse RSS feed.' });
      }
    }

    const listings = feed.items.map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate
    }));

    console.log(`✅ Found ${listings.length} listings for: ${searchTerm}`);
    res.json({ listings });
  } catch (err) {
    console.error('❌ AI Error:', err);
    res.status(500).json({ error: 'Something went wrong processing your request.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
