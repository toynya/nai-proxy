import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
  // CORS 設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    // 1. 從 body 讀取資料
    const { credentials, geminiPayload } = req.body;
    
    if (!credentials) return res.status(400).json({ error: "缺少 GCP JSON 憑證" });
    
    // 2. 建立認證
    const auth = new GoogleAuth({
      credentials: credentials, // 直接傳入物件
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';
    
    // 3. 發送請求
    const response = await client.request({
      url: url,
      method: 'POST',
      data: geminiPayload // 傳送 Gemini 的實際參數
    });

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
