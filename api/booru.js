export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // 1. 強制解析參數
  let bodyData = req.body || {};
  if (typeof req.body === 'string') {
    try { bodyData = JSON.parse(req.body); } catch (e) {}
  } else if (Buffer.isBuffer(req.body)) {
    try { bodyData = JSON.parse(req.body.toString()); } catch (e) {}
  }

  // 嘗試獲取目標網址
  let targetUrl = req.query.url || req.query.targetUrl || bodyData.targetUrl || bodyData.api || bodyData.url;

  if (!targetUrl) {
    return res.status(400).json({ error: "缺少目標網址", receivedBody: bodyData });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    
    // 2. 放寬白名單：只要結尾是 donmai.us (涵蓋 danbooru, safebooru 等)
    const isValidDomain = 
      parsedUrl.hostname.endsWith('donmai.us') || 
      parsedUrl.hostname.endsWith('gelbooru.com') || 
      parsedUrl.hostname.endsWith('e621.net') || 
      parsedUrl.hostname.endsWith('e926.net');

    if (!isValidDomain) {
      return res.status(403).json({ 
        error: "Vercel 代理攔截：不允許的網域", 
        hostname: parsedUrl.hostname 
      });
    }

    // 3. 發起請求：完美偽裝成 Chrome 瀏覽器，避免被 Danbooru 擋下
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    // 4. 如果被目標網站拒絕，明確回傳細節
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ 
        error: `目標網站拒絕了請求 (HTTP ${response.status})`, 
        details: errText.substring(0, 300) 
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Booru 代理內部錯誤: " + error.message });
  }
}
