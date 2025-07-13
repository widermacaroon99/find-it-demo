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
    console.log("Extracted keywords:", keywordResponse);

    const keywords = keywordResponse.split(",").map(k => k.trim());
    const searchTerm = encodeURIComponent(keywords[0]);
    console.log("Using search term:", searchTerm);

    const rssUrl = `https://calgary.craigslist.org/search/sss?format=rss&query=${searchTerm}`;
    const apiUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&premium=true&url=${encodeURIComponent(rssUrl)}`;
    console.log("Fetching RSS feed from:", apiUrl);

    const response = await axios.get(apiUrl);
    const feed = await parser.parseString(response.data);

    const results = feed.items.map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
    }));

    res.json({ keywords: keywordResponse, results });
  } catch (error) {
    console.error("Error during search:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
