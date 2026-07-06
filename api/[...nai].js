// 檔名：api/[...nai].js
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => { resolve(body); });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // 後端兜底 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-target-service');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const targetType = req.headers['x-target-service'];
  if (!targetType) return res.status(400).json({ error: "Missing x-target-service header" });

  const targetBaseUrl = targetType === 'user' ? 'https://api.novelai.net' : 'https://image.novelai.net';
  
  // Vercel Catch-All 會自動保留原始路徑，例如 /api/user/information
  const targetPath = req.url.replace(/^\/api/, ''); 
  const targetUrl = targetBaseUrl + targetPath;

  try {
    let rawBody = undefined;
    if (['POST', 'PUT'].includes(req.method)) {
      rawBody = await getRawBody(req);
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Authorization': req.headers.authorization
      },
      body: rawBody
    });

    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    
    // 原封不動回傳 (不論是 JSON 還是 ZIP 都能完美傳遞)
    res.status(response.status);
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    res.status(500).json({ error: "NAI 代理內部錯誤: " + error.message });
  }
}
