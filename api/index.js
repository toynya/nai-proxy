export default async function handler(req, res) {
  // 1. 設定 CORS (解決跨域)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // 2. 萬能分流器
  let targetBaseUrl = '';
  // 如果網址開頭是 /api/user，就丟給 api.novelai.net
  if (req.url.startsWith('/api/user')) {
    targetBaseUrl = 'https://api.novelai.net';
  } 
  // 如果網址開頭是 /api/image，就丟給 image.novelai.net
  else if (req.url.startsWith('/api/image')) {
    targetBaseUrl = 'https://image.novelai.net';
  } else {
    return res.status(404).json({ error: "路徑錯誤，請使用 /api/user 或 /api/image" });
  }

  // 3. 處理網址路徑 (把前綴去掉，組合成真正的 NovelAI 網址)
  const targetPath = req.url.replace('/api/user', '').replace('/api/image', '');
  const targetUrl = targetBaseUrl + targetPath;

  // 4. 轉發請求
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization // 使用前端傳來的 API Key
      },
      body: ['POST', 'PUT'].includes(req.method) ? JSON.stringify(req.body) : null
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: '代理錯誤: ' + error.message });
  }
}
