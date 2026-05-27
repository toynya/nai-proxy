import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // 確保回傳永遠是 JSON
  res.setHeader('Content-Type', 'application/json');

  try {
    const { credentials, geminiPayload, targetUrl } = req.body;
    
    if (!credentials || !targetUrl || !geminiPayload) {
        return res.status(400).json({ error: "後端缺少參數：credentials, targetUrl 或 geminiPayload" });
    }

    // 1. 取得認證
    const auth = new GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const accessToken = await auth.getAccessToken();

    // 2. 發起請求
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(geminiPayload)
    });

    // 3. 處理回應
    const data = await response.json();
    
    if (!response.ok) {
        return res.status(response.status).json({ error: "Google API 拒絕請求", details: data });
    }

    res.status(200).json(data);

  } catch (error) {
    // 這裡保證回傳 JSON，而不是 HTML
    res.status(500).json({ 
        error: "伺服器內部執行錯誤", 
        message: error.message,
        stack: error.stack 
    });
  }
}
