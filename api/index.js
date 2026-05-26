export default async function handler(req, res) {
  // 設定 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-target-service');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // 1. 決定目標網址
  const targetType = req.headers['x-target-service']; // 由前端傳來 'user' 或 'image'
  let targetBaseUrl = '';
  
  if (targetType === 'user') {
    targetBaseUrl = 'https://api.novelai.net';
  } else if (targetType === 'image') {
    targetBaseUrl = 'https://image.novelai.net';
  } else {
    return res.status(400).json({ error: "Missing x-target-service header" });
  }

  // 2. 處理路徑：假設請求是 /api/user/information，我們要去掉 /api，變成 /user/information
  // 將 req.url 的 /api 前綴去掉
  const targetPath = req.url.replace(/^\/api/, ''); 
  const targetUrl = targetBaseUrl + targetPath;

  // 3. 轉發請求
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: ['POST', 'PUT'].includes(req.method) ? JSON.stringify(req.body) : null
    });

    // 處理二進位圖片回應或 JSON 回應
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type');
    
    res.status(response.status);
    if (contentType && contentType.includes('application/json')) {
      res.json(JSON.parse(new TextDecoder().decode(buffer)));
    } else {
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.send(Buffer.from(buffer));
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
