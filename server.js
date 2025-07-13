const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(bodyParser.json());

app.post('/api/request', async (req, res) => {
  const { message } = req.body;

  try {
    // Step 1: Extract keywords using OpenAI
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Extract simple search terms from user requests for items or services. Return 2-3 short, comma-separated keywords.'
        },
        {
          role: 'user',
          content: message
        }
      ]
    });

    let keywords = aiResponse.choices[0].message.content.trim();
    console.log('✅ AI extracted keywords:', keywords);

    const searchTerm = encodeURIComponent(keywords.split(',')[0].trim());
    console.log('🔍 Using search term:', searchTerm);

    // Step 2: Use Apify Craigslist scraper (RealScraper-style integration)
    const apifyToken = process.env.APIFY_API_TOKEN;
    const runUrl = `https://api.apify.com/v2/acts/ivanvs~craigslist-scraper-pay-per-result/run-sync-get-dataset-items?token=${apifyToken}`;
    const body = {
      urls: [`https://calgary.craigslist.org/search/sss?query=${searchTerm}`],
      proxyConfiguration: { useApifyProxy: true }
    };

    const apifyResp = await axios.post(runUrl, body, {
      headers: { 'Content-Type': 'application/json' }
    });

    const items = apifyResp.data;
    const results = items.slice(0, 5).map(item => ({
      title: item.title,
      description: item.price ? `${item.price} • ${item.location}` : item.location,
      link: item.url
    }));

    console.log(`✅ Apify returned ${results.length} listings`);
    res.json({ results });

  } catch (error) {
    console.error('❌ FULL ERROR:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

