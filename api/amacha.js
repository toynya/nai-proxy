// 宣告使用 Edge Runtime (音樂串流必備)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  // CORS 預檢
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }

  // 獲取網址
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url') || url.searchParams.get('targetUrl');

  if (!targetUrl) {
    return Response.json({ error: "缺少 url 參數" }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    if (parsedUrl.hostname !== 'amachamusic.chagasi.com') {
      return Response.json({ error: "僅限代理 amachamusic.chagasi.com" }, { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // 發起請求抓音樂或網頁
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://amachamusic.chagasi.com/'
      }
    });

    // 準備回傳標頭
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    // 關鍵：將 response.body 作為 ReadableStream 直接回傳，讓前端可以邊載入邊播放 MP3！
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    return Response.json({ error: "Amacha Edge 代理錯誤: " + error.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}
