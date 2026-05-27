import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
  // --- 1. CORS 設定 ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // --- 2. 參數驗證 ---
  try {
    const { credentials, geminiPayload, targetUrl } = req.body;
    
    if (!credentials || !targetUrl || !geminiPayload) {
      return res.status(400).json({ 
        error: "後端缺少參數", 
        debug: { hasCredentials: !!credentials, hasTarget: !!targetUrl, hasPayload: !!geminiPayload } 
      });
    }

    // --- 除錯日誌：查看到底要請求哪裡 ---
    console.log("=== 正在進行代理請求 ===");
    console.log("目標 URL:", targetUrl);

    // --- 3. 取得認證 ---
    const auth = new GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const accessToken = await auth.getAccessToken();

    // --- 4. 發起請求 ---
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(geminiPayload)
    });

    // --- 5. 處理回應 (關鍵點：先檢查是否為 HTML 錯誤頁) ---
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
        // 如果 API 沒成功，嘗試讀取錯誤文字 (可能是 HTML)
        const errorText = await response.text();
        console.error("Google API 返回錯誤:", errorText);
        return res.status(response.status).json({ 
            error: "Google API 請求失敗", 
            details: errorText.substring(0, 200) // 只取錯誤訊息前 200 字，避免過長
        });
    }

    // 如果成功，讀取 JSON
    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    // 捕捉伺服器內部錯誤
    console.error("後端執行錯誤:", error);
    res.status(500).json({ 
        error: "伺服器內部錯誤", 
        message: error.message 
    });
  }
}
