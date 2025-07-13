require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const Parser = require("rss-parser");
const OpenAI = require("openai");

const app = express();
const port = process.env.PORT || 10000;
const parser = new Parser();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

app.post("/api/search", async (req, res) => {
  const { userPrompt } = req.body;

  try {
    // Extract keywords using OpenAI
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Extract 2-4 keywords from the user's request. Return a short comma-separated list only.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const keywordResponse = chatResponse.choices[0].message.content;
    console.log("✅ AI extracted keywords:", keywordResponse);

    // Use first keyword for simplicity
    const keywords = keywordResponse.split(",").map(k => k.trim());
    const searchTerm = encodeURIComponent(keywords[0]);
    console.log("🔍 Using search term:", searchTerm);

    const rssUrl = `https://calgary.craigslist.org/search/sss?format=rss&query=${searchTerm}`;
    const apiUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&premium=true&url=${encodeURIComponent(rssUrl)}`;
    console.log("🔗 Fetching RSS feed via ScraperAPI:", apiUrl);

    const response = await axios.get(apiUrl);
    const feed = await parser.parseString(response.data);

    const results = feed.items.map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
    }));

    res.json({ keywords: keywordResponse, results });
  } catch (error) {
    console.error("❌ FULL ERROR:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
✅ Requirements:
Add a .env file with:

ini
Copy
Edit
OPENAI_API_KEY=your_openai_key_here
SCRAPER_API_KEY=your_scraperapi_key_here
PORT=10000
Your package.json should include:

json
Copy
Edit
{
  "name": "find-it-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "axios": "^1.6.8",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.2",
    "openai": "^4.20.0",
    "rss-parser": "^3.12.0"
  }
}
