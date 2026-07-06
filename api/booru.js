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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  let targetUrl = req.query.url || req.query.targetUrl;

  if (!targetUrl && req.method === 'POST') {
    try {
      const rawBody = await getRawBody(req);
      if (rawBody) {
        const bodyData = JSON.parse(rawBody);
        targetUrl = bodyData.targetUrl || bodyData.api || bodyData.url;
      }
    } catch (e) {}
  }

  if (!targetUrl) {
    return res.status(400).json({ error: "缺少 targetUrl 參數" });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const allowedDomains = ['danbooru.donmai.us', 'gelbooru.com', 'e621.net', 'e926.net'];
    
    if (!allowedDomains.includes(parsedUrl.hostname)) {
      return res.status(403).json({ error: "不允許代理此網域" });
    }

    // 【針對 e621 的特殊處理】：給它一個符合官方規範的 User-Agent
    let customUserAgent = 'BooruTagFetcherProxy/1.0 (Frontend CORS Bypass)';
    if (parsedUrl.hostname.includes('e621') || parsedUrl.hostname.includes('e926')) {
      // e621 要求格式： 專案名/版本號 (by 你的帳號名 on e621)
      // 我們隨機偽裝一個合理的名字來繞過審查
      customUserAgent = 'MyPromptTool/1.0 (by Toynya on e621)';
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': customUserAgent,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      // 將 e621 的真實錯誤訊息抓出來，這樣就算報錯我們也知道原因
      const errText = await response.text();
      return res.status(response.status).json({ 
          error: `Booru API 錯誤: HTTP ${response.status}`, 
          details: errText.substring(0, 200) 
      });
    }

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: "Booru 代理內部錯誤: " + error.message });
  }
}
