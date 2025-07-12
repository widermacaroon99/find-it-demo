const { Configuration, OpenAIApi } = require("openai");

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/api/request', async (req, res) => {
  const { message } = req.body;

  try {
    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that extracts search terms from a user\'s message for local classified listings.' },
        { role: 'user', content: message }
      ]
    });

    const keywords = aiResponse.data.choices[0].message.content;

    // Log the AI interpretation
    console.log('Extracted keywords or task:', keywords);

    // Fake results using keywords (replace with real scraping later)
    const mockResults = [
      {
        title: `Search result: ${keywords}`,
        description: `Matched listing based on your input.`,
      },
    ];

    res.json({ results: mockResults });

  } catch (error) {
    console.error('OpenAI error:', error.message);
    res.status(500).json({ error: 'Something went wrong with AI response' });
  }
});
