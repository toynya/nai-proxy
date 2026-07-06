// 【關鍵修改】：關閉 Vercel 的預設自動解析，改用手動解析
export const config = { api: { bodyParser: false } };

// 手動讀取原始資料流的函數
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => { resolve(body); });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // 1. CORS 安全標頭 (保持原樣)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // 2. 獲取前端傳來的目標 URL (改成手動解析防護版)
  let targetUrl = req.query.url || req.query.targetUrl;

  // 如果是 POST 且網址裡沒有帶參數，就手動從 body 解開
  if (!targetUrl && req.method === 'POST') {
    try {
      const rawBody = await getRawBody(req);
      if (rawBody) {
        const bodyData = JSON.parse(rawBody);
        targetUrl = bodyData.targetUrl || bodyData.api || bodyData.url;
      }
    } catch (e) {
      // JSON 解析失敗忽略，交給下面的 400 報錯
    }
  }

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

    // 3. 發起請求 (完全保持你原本可以通過 e621 的 User-Agent！)
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
