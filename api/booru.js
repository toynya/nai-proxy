export default async function handler(req, res) {
  // 1. CORS 安全標頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // 2. 獲取前端傳來的目標 URL
  const { targetUrl } = req.method === 'POST' ? req.body : req.query;

  if (!targetUrl) {
    return res.status(400).json({ error: "缺少 targetUrl 參數" });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const allowedDomains = ['danbooru.donmai.us', 'gelbooru.com', 'e621.net', 'e926.net'];
    
    // 安全防護：只允許代理這四個指定的 booru 網站
    if (!allowedDomains.includes(parsedUrl.hostname)) {
      return res.status(403).json({ error: "不允許代理此網域" });
    }

    // 3. 發起請求 (帶上 e621 要求的自定義 User-Agent)
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'BooruTagFetcherProxy/1.0 (Frontend CORS Bypass)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Booru API 錯誤: ${response.statusText}` });
    }

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: "Booru 代理內部錯誤: " + error.message });
  }
}
