// Content for /alternatives/<slug>: pages for developers replacing an image search API that shut down.
// Facts about other products must be checked and dated. Update `updated` (and PAGE_UPDATED in
// site-meta.js) whenever a page changes, and re-check the facts at least every three months.

const PLUKO_REQUEST = `curl -X POST "$PLUKO_URL/v1/images/search" \\
  -H "Authorization: Bearer $PLUKO_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: wait=5" \\
  -d '{"query": "concrete architecture", "count": "35", "safe_search": "moderate"}'`;

export const alternatives = {
  'bing-image-search-api': {
    name: 'Bing Image Search API',
    title: 'Bing Image Search API Alternative — Pluko',
    description:
      'Microsoft retired the Bing Search APIs, including image search, on August 11, 2025. Pluko is an image search API that returns image URLs, sources and metadata. Field mapping and migration steps inside.',
    heading: 'A replacement for the Bing Image Search API',
    updated: '2026-11-14',
    answer:
      'Microsoft retired the Bing Search APIs, including Bing Image Search, on August 11, 2025. Existing keys stopped working and new sign-ups closed. Pluko is an image search API you can move to: send a query, get back image URLs, thumbnails, source pages and dimensions as JSON, for one query or thousands in a single job.',
    facts: [
      ['What happened', 'Microsoft announced on May 12, 2025 that the Bing Search APIs would be retired on August 11, 2025, and that existing instances would be decommissioned.'],
      ['What Microsoft suggests instead', 'Grounding with Bing Search in Azure AI Agents. It feeds search into an AI agent’s answer and does not return raw image results you can show or store.'],
      ['What that means for image search', 'Apps that showed image results, filled catalogues or built datasets from Bing Image Search need a different API that returns image URLs.'],
    ],
    oldRequest: `curl "https://api.bing.microsoft.com/v7.0/images/search?q=concrete+architecture&count=35&safeSearch=Moderate" \\
  -H "Ocp-Apim-Subscription-Key: $BING_KEY"`,
    plukoRequest: PLUKO_REQUEST,
    fieldMap: [
      ['value[].contentUrl', 'images[].image_url'],
      ['value[].thumbnailUrl', 'images[].thumbnail_url'],
      ['value[].hostPageUrl', 'images[].source_url'],
      ['value[].name', 'images[].title'],
      ['value[].width / height', 'images[].width / height'],
      ['count, offset', 'count per query; results read in pages with next_cursor'],
      ['safeSearch', 'safe_search: moderate or strict (it cannot be turned off)'],
      ['imageType, aspect, size, color', 'image_type, layout, size, color'],
    ],
    differences: [
      ['Asynchronous jobs', 'A search is a job. You can wait up to 10 seconds for the first results, check back, or get a signed webhook when it finishes.'],
      ['Batches', 'Send many queries in one request instead of looping and handling rate limits yourself.'],
      ['Counts', 'Ask for as many images per query as you need; Pluko fetches more pages in the background.'],
      ['No hosted images', 'Like Bing, Pluko returns links to images on their original sites. It never hosts or downloads the files.'],
    ],
    faqs: [
      ['Is the Bing Image Search API still available?', 'No. Microsoft retired the Bing Search APIs, including image search, on August 11, 2025. Only a few partners with private agreements kept access.'],
      ['Does Grounding with Bing Search return image URLs?', 'It is built to ground an AI agent’s answers and does not give you raw image search results to display or store.'],
      ['How long does it take to move to Pluko?', 'For most apps it is one request and a field rename. Create a key, send the query to POST /v1/images/search, and read image_url, thumbnail_url and source_url from the results.'],
      ['Can I keep showing results to users straight away?', 'Yes. Send Prefer: wait=5 and small searches return their first page of images in the same response.'],
    ],
  },
  'google-custom-search-api': {
    name: 'Google Custom Search JSON API',
    title: 'Google Custom Search API Alternative for Image Search — Pluko',
    description:
      'Google’s Custom Search JSON API is closed to new customers and will be discontinued on January 1, 2027. Pluko is an image search API that returns image URLs, sources and metadata. Migration guide inside.',
    heading: 'An image search alternative to Google’s Custom Search JSON API',
    updated: '2026-11-14',
    answer:
      'Google’s Custom Search JSON API no longer accepts new customers, and Google has set January 1, 2027 as the date it will be discontinued. If you used it with searchType=image to find pictures, Pluko is an image search API you can move to: send a query and get back image URLs, thumbnails, source pages and dimensions as JSON.',
    facts: [
      ['What is changing', 'The Custom Search JSON API is closed to new customers, and Google lists January 1, 2027 as its discontinuation date.'],
      ['What Google suggests instead', 'Vertex AI Search and related Google Cloud products, which focus on searching your own content or a limited set of sites rather than images from the whole web.'],
      ['What that means for image search', 'Apps that called the API with searchType=image need another API that returns image URLs from across the web.'],
    ],
    oldRequest: `curl "https://www.googleapis.com/customsearch/v1?key=$GOOGLE_KEY&cx=$ENGINE_ID&q=concrete+architecture&searchType=image&num=10"`,
    plukoRequest: PLUKO_REQUEST,
    fieldMap: [
      ['items[].link', 'images[].image_url'],
      ['items[].image.thumbnailLink', 'images[].thumbnail_url'],
      ['items[].image.contextLink', 'images[].source_url'],
      ['items[].title', 'images[].title'],
      ['items[].image.width / height', 'images[].width / height'],
      ['num (max 10), start', 'count per query (no 10-result pages); results read with next_cursor'],
      ['safe', 'safe_search: moderate or strict'],
      ['imgType, imgSize, imgColorType, imgDominantColor', 'image_type, size, color'],
    ],
    differences: [
      ['No search engine ID', 'There is no cx value or engine to configure. Send the query and the filters you want.'],
      ['More than 10 at a time', 'Ask for as many images per query as you need instead of paging 10 at a time up to 100.'],
      ['Batches and webhooks', 'Send many queries in one job and get a signed webhook when it finishes.'],
      ['Usage you can see', 'Daily usage and request logs are in the workspace and at GET /v1/usage.'],
    ],
    faqs: [
      ['When does the Google Custom Search JSON API shut down?', 'Google lists January 1, 2027 as the discontinuation date. It is already closed to new customers.'],
      ['Is Vertex AI Search a replacement for image search?', 'It is built for searching your own content or a limited set of sites, not for finding images across the whole web.'],
      ['How do I move image searches to Pluko?', 'Replace the customsearch/v1 call with POST /v1/images/search, drop the cx parameter, and read image_url, thumbnail_url and source_url instead of link and image.contextLink.'],
      ['Do I still need to page through results 10 at a time?', 'No. Set count to the number of images you want; read them in pages of up to 100.'],
    ],
  },
};

export const ALTERNATIVE_SLUGS = Object.keys(alternatives);
