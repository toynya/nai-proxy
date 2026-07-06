// 【關鍵修改】：關閉 Vercel 的預設自動解析，改用手動解析
export const config = {
  api: {
    bodyParser: false,
  },
};

// 手動讀取原始資料流的函數
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // 1. CORS 安全標頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-target-service');

  if (req.method === 'OPTIONS') { 
    res.status(200).end(); 
    return; 
  }

  // 2. 決定目標網址 (根據前端的 x-target-service Header 分流)
  const targetType = req.headers['x-target-service'];
  let targetBaseUrl = '';
  
  if (targetType === 'user') {
    targetBaseUrl = 'https://api.novelai.net';
  } else if (targetType === 'image') {
    targetBaseUrl = 'https://image.novelai.net';
  } else {
    return res.status(400).json({ error: "Missing x-target-service header" });
  }

  // 處理路徑：將 req.url 的 /api 前綴去掉
  const targetPath = req.url.replace(/^\/api/, ''); 
  const targetUrl = targetBaseUrl + targetPath;

  try {
    // 3. 手動讀取前端傳來的原始 Body (如果是 POST 請求)
    let rawBody = undefined;
    if (['POST', 'PUT'].includes(req.method)) {
      rawBody = await getRawBody(req);
    }

    // 4. 原封不動將資料轉發給 NovelAI
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Authorization': req.headers.authorization
      },
      body: rawBody // 直接轉發字串，不進行任何 JSON 解析干預
    });

    // 5. 處理 NovelAI 的回應 (判斷是 JSON 還是 ZIP/圖片二進位檔)
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type');
    
    res.status(response.status);
    
    if (contentType && contentType.includes('application/json')) {
      // 嘗試解析 JSON 錯誤訊息
      try {
        res.json(JSON.parse(new TextDecoder().decode(buffer)));
      } catch (e) {
        res.send(Buffer.from(buffer));
      }
    } else {
      // 回傳圖片/ZIP 的二進位資料
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.send(Buffer.from(buffer));
    }
  } catch (error) {
    res.status(500).json({ error: "NAI 代理內部錯誤: " + error.message });
  }
}    // 處理二進位圖片回應或 JSON 回應
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
