import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
  // CORS 設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gcp-json');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    // 從 Header 讀取用戶動態上傳的 JSON
    const gcpJsonString = req.headers['x-gcp-json'];
    if (!gcpJsonString) return res.status(400).json({ error: "缺少 GCP JSON 憑證" });
    
    const credentials = JSON.parse(gcpJsonString);
    
    // 使用 google-auth-library 進行動態認證
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';
    
    // 發送請求給 Gemini
    const response = await client.request({
      url: url,
      method: 'POST',
      data: req.body
    });

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
