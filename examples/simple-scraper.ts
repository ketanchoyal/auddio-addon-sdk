import { AddonServer } from "../src/index";

const addon = new AddonServer({
  id: "com.audioio.example-scraper",
  name: "Example Scraper",
  version: "1.0.0",
  type: "SCRAPER",
  capabilities: ["SEARCH"],
  description: "A simple example scraper using audioio-addon-sdk",
});

addon.onSearch(async (query) => {
  console.log("Search query received:", query);
  
  return {
    results: [
      {
        title: "Dune",
        author: "Frank Herbert",
        infoHash: "abc123def456789012345678901234567890abcd",
        size: 524288000,
        seeders: 50,
        leechers: 5,
        source: "ExampleSource",
      },
    ],
    total: 1,
    query: {
      title: query.title,
      author: query.author,
    },
  };
});

addon.listen(3000);
