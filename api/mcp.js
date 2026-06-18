export const config = {
  runtime: 'edge', // 必須設定為 edge 才能支援 SSE 串流
};

export default async function handler(req) {
  // 處理 CORS 預檢請求
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  // 從 Headers 中取得要代理的真實目標網址
  const targetUrl = req.headers.get('x-target-url');
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing x-target-url header' }), { 
      status: 400, 
      headers: { 'Access-Control-Allow-Origin': '*' } 
    });
  }

  try {
    const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined;

    // 向真實伺服器 (HuggingFace) 發起請求
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Accept': req.headers.get('Accept') || '*/*',
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
      },
      body
    });

    // 複製對方的回傳 Header，並強制加上允許跨域
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Headers', '*');

    // 將 Stream 串流或文字直接中轉回傳給前端
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
