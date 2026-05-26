export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // 判斷要發送到哪個 NovelAI 伺服器
  // 我們讓前端在 Header 裡告訴我們目標是哪一個
  const targetType = req.headers['x-target-service']; // 'user' 或 'image'
  let targetUrl = '';
  
  if (targetType === 'user') {
    targetUrl = 'https://api.novelai.net' + req.url.replace('/api', '');
  } else if (targetType === 'image') {
    targetUrl = 'https://image.novelai.net' + req.url.replace('/api', '');
  } else {
    return res.status(400).json({ error: "請在 Header 設定 x-target-service 為 'user' 或 'image'" });
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: ['POST', 'PUT'].includes(req.method) ? JSON.stringify(req.body) : null
    });

    const data = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
