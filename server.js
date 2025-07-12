const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const Parser = require('rss-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// RSS Parser
const parser = new Parser();

// Endpoint
app.post('/api/request', async (req, res) => {
  const { message } = req.body;

  try {
    // Step 1: Extract keywords from user input
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Extract simple search terms from user requests for local classifieds. Return 2–3 short comma-separated keywords only.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    let keywords = aiResponse.choices[0].message.content.trim();
    console.log('✅ AI extracted keywords:', keywords);

    // Sanitize and extract first keyword
    keywords = keywords.replace(/^.*?(?=\b[a-z])/i, ''); // remove prefix
    const searchTerm = encodeURIComponent(keywords.split(',')[0].trim());
    console.log('🔍 Using search term:', searchTerm);

    // Step 2: Query Kijiji RSS feed
    const rssUrl = `https://www.kijiji.ca/rss-srp-buy-sell/calgary/${searchTerm}/k0l1700199`;
    const feed = await parser.parseURL(rssUrl);

    const results = feed.items.slice(0, 5).map(item => ({
      title: item.title,
      description: item.contentSnippet,
      link: item.link
    }));

    console.log(`✅ Found ${results.length} RSS listings for "${searchTerm}"`);
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
