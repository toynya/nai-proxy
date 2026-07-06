// 【上帝模式】：禁用 Vercel 的自動解析，防止資料遺失
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
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    let targetUrl = req.query.url || req.query.targetUrl;

    // 手動接管 POST Body 解析
    if (!targetUrl && (req.method === 'POST' || req.method === 'PUT')) {
      const rawBody = await getRawBody(req);
      if (rawBody) {
        const bodyData = JSON.parse(rawBody);
        targetUrl = bodyData.targetUrl || bodyData.api || bodyData.url;
      }
    }

    if (!targetUrl) {
      return res.status(400).json({ error: "缺少目標網址" });
    }

    // 發起請求：使用符合 e621/Danbooru 規範的專屬 UA，避免觸發 Cloudflare
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'MyTRPGProxyTool/1.0 (contact: test@example.com)', // 絕對不能用 Chrome
        'Accept': 'application/json'
      }
    });

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
