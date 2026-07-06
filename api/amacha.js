// 檔名：api/amacha.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // 正確獲取網址參數
  const targetUrl = req.query.url || req.query.targetUrl;

  if (!targetUrl) {
    return res.status(400).json({ error: "缺少 url 參數" });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    if (parsedUrl.hostname !== 'amachamusic.chagasi.com') {
      return res.status(403).json({ error: "僅限代理 amachamusic.chagasi.com" });
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://amachamusic.chagasi.com/'
      }
    });

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.status(response.status);

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    res.status(500).json({ error: "Amacha 代理錯誤: " + error.message });
  }
}
