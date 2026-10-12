// Curated, illustrative photography. These samples never call the search provider.
const photo = (id, title) => ({
  id,
  title,
  url: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=960&q=80`,
});
export const collections = [
  {
    name: "Architecture",
    query: "concrete architecture",
    photos: [
      photo(
        "photo-1487958449943-2429e8be8625",
        "Sculptural white architecture",
      ),
      photo("photo-1511818966892-d7d671e672a2", "Geometry in concrete"),
      photo(
        "photo-1486718448742-163732cd1544",
        "Sculptural architectural detail",
      ),
      photo("photo-1486406146926-c627a92ad1ab", "Looking up at the city"),
      photo("photo-1497366754035-f200968a6e72", "Light-filled interior"),
      photo("photo-1494526585095-c41746248156", "Residential architecture"),
    ],
  },
  {
    name: "Landscapes",
    query: "quiet mountain landscapes",
    photos: [
      photo("photo-1464822759023-fed622ff2c3b", "Mountain summit"),
      photo("photo-1470770841072-f978cf4d019e", "Reflections in the mountains"),
      photo("photo-1500534623283-312aade485b7", "Open landscape"),
      photo("photo-1441974231531-c6227db76b6e", "Forest light"),
      photo("photo-1472396961693-142e6e269027", "A quiet moment in nature"),
      photo("photo-1501854140801-50d01698950b", "Green mountain valley"),
    ],
  },
  {
    name: "Objects",
    query: "everyday objects and design",
    photos: [
      photo("photo-1505740420928-5e560c06d30e", "Over-ear headphones"),
      photo("photo-1523275335684-37898b6baf30", "Minimal wristwatch"),
      photo("photo-1495474472287-4d71bcdd2085", "Coffee ritual"),
      photo("photo-1541643600914-78b084683601", "Glass perfume bottle"),
      photo("photo-1526170375885-4d8ecf77b99f", "Classic camera"),
      photo("photo-1542291026-7eec264c27ff", "Running shoe"),
    ],
  },
];

export const faqs = [
  [
    "Does Pluko return image files or URLs?",
    "Pluko returns image URLs and metadata. Your application loads images from their original hosts. Pluko does not host or download the image files.",
  ],
  [
    "Are thumbnails and full-image URLs both available?",
    "Results can include both a thumbnail URL and a full-image URL when available. Availability and dimensions vary by source.",
  ],
  [
    "Can I submit multiple queries?",
    "Yes. Submit a batch with a separate query and requested count for each search. Retrieve the results in pages as the job progresses.",
  ],
  [
    "Will I always receive the requested count?",
    "Not necessarily. Source availability, duplicates, quotas, or provider errors can reduce the final result count. The job reports its final status and a reason when a query stops early.",
  ],
  [
    "Does Pluko store images?",
    "No. Pluko stores service metadata and logs, not downloaded image files.",
  ],
  [
    "Can I use the images commercially?",
    "Search results do not grant reuse rights. Review the source and its licensing terms before using an image.",
  ],
];

export const searchPayload = {
  query: "concrete architecture",
  count: "15",
  min_width: 1000,
};
export const steps = ["Create search", "Check status", "Get results"];
export const languages = ["cURL", "JavaScript", "Python"];
export function requestExample(language, step) {
  const route = [
    "/v1/images/search",
    "/v1/jobs/JOB_ID",
    "/v1/jobs/JOB_ID/results?limit=100&after=0",
  ][step];
  const body = JSON.stringify(searchPayload, null, 2);
  if (language === "cURL")
    return `curl ${step === 0 ? "-X POST " : ""}"$PLUKO_URL${route}" \\\n  -H "Authorization: Bearer $PLUKO_API_KEY"${step === 0 ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'` : ""}`;
  if (language === "JavaScript")
    return `const response = await fetch(\n  process.env.PLUKO_URL + '${route}',\n  {\n${step === 0 ? "    method: 'POST',\n" : ""}    headers: {\n      Authorization: \`Bearer \${process.env.PLUKO_API_KEY}\`${step === 0 ? ",\n      'Content-Type': 'application/json'" : ""}\n    }${step === 0 ? `,\n    body: JSON.stringify(${body.replaceAll("\n", "\n    ")})` : ""}\n  }\n);\nif (!response.ok) throw new Error(await response.text());\nconst data = await response.json();`;
  return `import json\nimport os\nfrom urllib.request import Request, urlopen\n\nrequest = Request(\n    os.environ["PLUKO_URL"] + "${route}",\n${step === 0 ? `    data=json.dumps(${body.replaceAll("\n", "\n    ")}).encode(),\n` : ""}    headers={\n        "Authorization": "Bearer " + os.environ["PLUKO_API_KEY"]${step === 0 ? ',\n        "Content-Type": "application/json"' : ""}\n    },\n)\nwith urlopen(request) as response:\n    data = json.load(response)`;
}
export const responses = [
  {
    job_id: "job_example",
    reused: false,
    status_url: "/v1/jobs/job_example",
    results_url: "/v1/jobs/job_example/results",
    request_id: "req_example",
  },
  {
    job: { id: "job_example", status: "running", requested: "15", returned: 6 },
    request_id: "req_example",
  },
  {
    images: [
      {
        id: "img_example",
        title: "Concrete architecture",
        image_url: "https://source.example/image.jpg",
        thumbnail_url: "https://source.example/preview.jpg",
        source_url: "https://source.example/photo",
        width: 1600,
        height: 1200,
        dimensions_verified: false,
        license_status: "unknown",
      },
    ],
    next_cursor: null,
    request_id: "req_example",
  },
];
