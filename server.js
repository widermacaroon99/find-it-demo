const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// OpenAI Setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST endpoint
app.post('/api/request', async (req, res) => {
  const { message } = req.body;

  try {
    // Ask OpenAI to extract useful search keywords
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts search keywords or item categories from a user\'s message for local classifieds (e.g., Kijiji, Craigslist, etc). Reply with short search terms only.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const keywords = aiResponse.choices[0].message.content;
    console.log('AI extracted keywords:', keywords);

    // Return mock search results
    const mockResults = [
      {
        title: `Search term suggestion: ${keywords}`,
        description: `These are suggested terms you can use to search local listings.`,
      },
      {
        title: 'Coming Soon: Real listings',
        description: 'We’ll soon fetch live results from Kijiji and other marketplaces based on these keywords!',
      },
    ];

    res.json({ results: mockResults });

  } catch (error) {
    console.error('OpenAI error:', error.message);
    res.status(500).json({ error: 'AI failed to respond. Try again.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
})
