// 宣告使用 Edge Runtime (突破超時與體積限制)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  // 1. 處理 CORS OPTIONS 預檢
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }

  // 2. 獲取目標服務 (user 或 image)
  const targetType = req.headers.get('x-target-service');
  if (!targetType) {
    return Response.json({ error: "缺少 x-target-service 標頭" }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const targetBaseUrl = targetType === 'user' ? 'https://api.novelai.net' : 'https://image.novelai.net';
  
  // 3. 解析路徑
  const url = new URL(req.url);
  let targetPath = url.pathname.replace(/^\/api\//, ''); // 拔掉 /api/
  const targetUrl = `${targetBaseUrl}/${targetPath}`;

  try {
    // 4. 準備轉發的 Headers
    const fetchHeaders = new Headers();
    const auth = req.headers.get('authorization');
    if (auth) fetchHeaders.set('Authorization', auth);
    
    const contentType = req.headers.get('content-type');
    if (contentType) fetchHeaders.set('Content-Type', contentType);

    // 5. 準備轉發設定
    const fetchOptions = {
      method: req.method,
      headers: fetchHeaders,
      // Edge 環境下，直接將 req.body 串流導向目標，不需要任何 Buffer 解析！
      body: (req.method !== 'GET' && req.method !== 'HEAD') ? req.body : undefined,
      duplex: 'half' // 啟用串流必備屬性
    };

    // 6. 發起請求
    const response = await fetch(targetUrl, fetchOptions);

    // 7. 將目標的 Response 原封不動串流回前端，並補上 CORS
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    return Response.json({ error: "NAI Edge 代理錯誤: " + error.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}
