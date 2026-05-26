export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    let targetBaseUrl = '';
    let targetPath = '';

    if (req.url.startsWith('/api/user')) {
      targetBaseUrl = 'https://api.novelai.net';
      targetPath = req.url.replace('/api/user', '');
    } else if (req.url.startsWith('/api/image')) {
      targetBaseUrl = 'https://image.novelai.net';
      targetPath = req.url.replace('/api/image', '');
    } else {
      return res.status(404).json({ error: `無效的路徑: ${req.url}` });
    }

    const targetUrl = targetBaseUrl + targetPath;
    console.log(`[Proxy] 轉發至: ${targetUrl}`); // 這行會顯示在 Vercel Logs

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: ['POST', 'PUT'].includes(req.method) ? JSON.stringify(req.body) : null
    });

    // 將 NovelAI 的回應狀態和資料傳回前端
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        res.status(response.status).json(data);
    } else {
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'application/octet-stream');
        res.status(response.status).send(Buffer.from(buffer));
    }

  } catch (error) {
    console.error(`[Proxy Error]`, error); // 這行會顯示在 Vercel Logs
    res.status(500).json({ error: '代理內部錯誤: ' + error.message });
  }
}
