export default async function handler(req, res) {
  // 設定 CORS，允許前端傳送 Authorization 標頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // 從前端發過來的請求中，讀取使用者填入的 API Key
  const userApiKey = req.headers.authorization;

  if (!userApiKey) {
    res.status(401).json({ error: "請提供 API Key" });
    return;
  }

  // 轉發請求給 Novel AI
  try {
    const response = await fetch('https://api.novelai.net/v1/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': userApiKey, // 使用前端傳來的 Key
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
