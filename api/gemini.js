import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const { credentials, geminiPayload, targetUrl } = req.body;
    
    if (!credentials || !targetUrl || !geminiPayload) {
        return res.status(400).json({ error: "缺少必要的參數 (credentials, targetUrl, geminiPayload)" });
    }

    // 1. 使用 GoogleAuth 僅僅為了取得 Access Token (這是最乾淨的做法)
    const auth = new GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    // 取得 Bearer Token
    const accessToken = await auth.getAccessToken();

    // 2. 轉發請求，不干預內容，直接透傳
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(geminiPayload)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
