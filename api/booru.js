export default async function handler(req, res) {
  // 允許所有標頭，防止 Vercel 阻擋跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*'); 

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // 【終極防護】：手動解析 body，無視 Vercel 的自動解析是否失效
  let bodyData = req.body || {};
  if (typeof req.body === 'string') {
    try { bodyData = JSON.parse(req.body); } catch (e) {}
  } else if (Buffer.isBuffer(req.body)) {
    try { bodyData = JSON.parse(req.body.toString()); } catch (e) {}
  }

  // 嘗試從所有可能的地方抓取目標網址
  let targetUrl = req.query.url || req.query.targetUrl || bodyData.targetUrl || bodyData.api;

  if (!targetUrl) {
    return res.status(400).json({ error: "缺少 targetUrl 參數" });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const allowedDomains = ['danbooru.donmai.us', 'gelbooru.com', 'e621.net', 'e926.net'];
    
    if (!allowedDomains.includes(parsedUrl.hostname)) {
      return res.status(403).json({ error: "不允許代理此網域" });
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'BooruTagFetcherProxy/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return res.status(response.status).json({ error: `Booru API 錯誤: ${response.statusText}` });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Booru 代理錯誤: " + error.message });
  }
}
