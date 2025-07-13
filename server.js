require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const bodyParser = require("body-parser");
const { OpenAI } = require("openai");
const Parser = require("rss-parser");

const app = express();
const port = process.env.PORT || 10000;
const parser = new Parser();

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/search", async (req, res) => {
  const userInput = req.body.message;

  try {
    console.log("User input:", userInput);

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Extract 2 to 3 concise keywords from the user's request that can be used in a classified ad search.",
        },
        {
          role: "user",
          content: userInput,
        },
      ],
    });

    const keywordResponse = chatCompletion.choices[0].message.content;
    console.log("AI extracted keywords:", keywordResponse);

    const keywords = encodeURIComponent(keywordResponse.split(",")[0].trim());
    const city = "calgary";
    const craigslistURL = `https://${city}.craigslist.org/search/sss?format=rss&query=${keywords}`;

    const response = await axios.get(`http://api.scraperapi.com`, {
      params: {
        api_key: process.env.SCRAPER_API_KEY,
        url: craigslistURL,
        premium: true,
      },
    });

    const feed = await parser.parseString(response.data);

    const items = feed.items.map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
    }));

    res.json({ listings: items });
  } catch (error) {
    console.error("Error:", error.message || error);
    res.status(500).json({ error: "Something went wrong while processing your request." });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
