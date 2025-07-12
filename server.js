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

app.post('/api/request', (req, res) => {
  const { message } = req.body;

  console.log('Received request:', message);

  const mockResults = [
    {
      title: 'Free Dirt - Clean Fill',
      description: 'Local listing on Kijiji - pickup available 2km away.',
    },
    {
      title: 'Sod Rolls - $3 each',
      description: 'Facebook Marketplace deal nearby, pickup only.',
    },
    {
      title: 'Landscaper for Hire',
      description: 'Highly rated Google listing offering dump trailer delivery.',
    },
  ];

  res.json({ results: mockResults });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
