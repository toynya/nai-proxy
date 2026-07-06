export default async function handler(req, res) {
  // 1. CORS 安全標頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // 2. 從 query 取得目標 URL (因為是 GET 請求，參數放在網址後面)
  // 範例: /api/amacha?url=https://amachamusic.chagasi.com/music_healing.html
  const targetUrl = req.query.url;

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
      // 如果是 MP3 音檔，回傳二進位 Buffer
      const buffer = await response.arrayBuffer();
      res.status(200).send(Buffer.from(buffer));
    }

  } catch (error) {
    res.status(500).json({ error: "Amacha 代理內部錯誤: " + error.message });
  }
}
