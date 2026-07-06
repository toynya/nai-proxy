// 【關鍵修改】：關閉 Vercel 的預設自動解析，改用手動解析
export const config = {
  api: {
    bodyParser: false,
  },
};

// 手動讀取原始資料流的函數
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // 1. CORS 安全標頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { 
    res.status(200).end(); 
    return; 
  }

  // 2. 獲取前端傳來的目標 URL
  let targetUrl = req.query.url || req.query.targetUrl;

  if (!targetUrl && req.method === 'POST') {
    try {
      const rawBody = await getRawBody(req);
      if (rawBody) {
        const bodyData = JSON.parse(rawBody);
        targetUrl = bodyData.url || bodyData.targetUrl;
      }
    } catch (e) {}
  }

  if (!targetUrl) {
    return res.status(400).json({ error: "缺少 url 參數" });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    
    // 安全防護
    if (parsedUrl.hostname !== 'amachamusic.chagasi.com') {
      return res.status(403).json({ error: "不允許代理此網域，僅限 amachamusic.chagasi.com" });
    }

    // 3. 發起請求 (⚠️ 關鍵修改：完美偽裝成 Windows Chrome 瀏覽器)
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8,zh-TW;q=0.7,zh;q=0.6',
        'Referer': 'https://amachamusic.chagasi.com/',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Amacha API 錯誤: ${response.statusText}` });
    }

    // 4. 判斷回傳類型 (HTML 網頁 還是 MP3 檔案)
    const contentType = response.headers.get('content-type') || '';
    res.setHeader('Content-Type', contentType);

    if (contentType.includes('text/html')) {
      const text = await response.text();
      res.status(200).send(text);
    } else {
      const buffer = await response.arrayBuffer();
      res.status(200).send(Buffer.from(buffer));
    }

  } catch (error) {
    res.status(500).json({ error: "Amacha 代理內部錯誤: " + error.message });
  }
}
