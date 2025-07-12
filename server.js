const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');
console.log('✅ Loaded Kijiji HTML. Looking for .search-item nodes...');
console.log('Preview of HTML:', $.html().slice(0, 300)); // Log the first 300 chars of the HTML

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Route: /api/request
app.post('/api/request', async (req, res) => {
  const { message } = req.body;

  try {
    // Step 1: Use OpenAI to extract search keywords
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts short keywords from user requests for local classified listings.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    let keywords = aiResponse.choices[0].message.content.trim();

// Remove prefixes like "Keywords: " or "Extracted keywords:"
keywords = keywords.replace(/^.*?(dirt|sod|gravel|topsoil|mulch|landscaping)/i, (match, firstKeyword) => {
  const rest = match.slice(match.indexOf(firstKeyword));
  return rest;
});
    console.log('AI extracted keywords:', keywords);

    // Step 2: Use first keyword for Kijiji scraping
    const searchTerm = encodeURIComponent(keywords.split(',')[0].trim());
    const searchUrl = `https://www.kijiji.ca/b-calgary/${searchTerm}/k0l1700199`;

    const response = await axios.get(searchUrl);
    const $ = cheerio.load(response.data);

    const results = [];

    $('.search-item').each((i, el) => {
      console.log('Total listings scraped:', results.length);
if (results.length === 0) {
  console.log('⚠️ No .search-item elements found. Kijiji layout may have changed.');
}
      const title = $(el).find('.title').text().trim();
      const description = $(el).find('.description').text().trim();
      const linkPath = $(el).find('a').attr('href');
      const link = linkPath ? `https://www.kijiji.ca${linkPath}` : null;

      if (title && link) {
        results.push({
          title,
          description,
          link,
        });
      }
    });

    console.log(`✅ Found ${results.length} Kijiji listings for: ${searchTerm}`);
    res.json({ results: results.slice(0, 5) }); // send top 5

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
