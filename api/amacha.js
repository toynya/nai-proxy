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
  // 優先從網址參數 (GET) 獲取
  let targetUrl = req.query.url || req.query.targetUrl;

  // 如果是 POST 且網址裡沒有帶參數，就手動從 body 解開
  if (!targetUrl && req.method === 'POST') {
    try {
      const rawBody = await getRawBody(req);
      if (rawBody) {
        const bodyData = JSON.parse(rawBody);
        targetUrl = bodyData.url || bodyData.targetUrl;
      }
    } catch (e) {
      // JSON 解析失敗忽略，交給下面的 400 報錯
    }
  }

  if (!targetUrl) {
    return res.status(400).json({ error: "缺少 url 參數" });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    
    // 安全防護：只允許代理甘茶の音楽工房
    if (parsedUrl.hostname !== 'amachamusic.chagasi.com') {
      return res.status(403).json({ error: "不允許代理此網域，僅限 amachamusic.chagasi.com" });
    }

    // 3. 發起請求
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'TRPG-Frontend-BGM-Fetcher/1.0',
        'Referer': 'https://amachamusic.chagasi.com/'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Amacha API 錯誤: ${response.statusText}` });
    }

    // 4. 判斷回傳類型 (HTML 網頁 還是 MP3 檔案)
    const contentType = response.headers.get('content-type') || '';
    res.setHeader('Content-Type', contentType);

    if (contentType.includes('text/html')) {
      // 如果是網頁，回傳純文字讓前端去解析
      const text = await response.text();
      res.status(200).send(text);
    } else {
      // 如果是 MP3 音檔，回傳二進位 Buffer (完美透傳音訊流)
      const buffer = await response.arrayBuffer();
      res.status(200).send(Buffer.from(buffer));
    }

  } catch (error) {
    res.status(500).json({ error: "Amacha 代理內部錯誤: " + error.message });
  }
}
