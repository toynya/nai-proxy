export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // 最寬鬆的 CORS 標頭設定
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
        'Access-Control-Allow-Headers': '*',
    };

    // 處理瀏覽器跨域預檢請求 (OPTIONS)
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    // 從網址參數 ?target= 中取得真實目的地，避免 Header 被瀏覽器攔截
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('target') || req.headers.get('x-target-url');

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing target URL parameter' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
    }

    try {
        const body = (req.method === 'POST' || req.method === 'PUT') ? await req.text() : undefined;
        
        // 向真實伺服器發起請求
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Accept': req.headers.get('Accept') || '*/*',
                'Content-Type': req.headers.get('Content-Type') || 'application/json',
            },
            body
        });

        // 繼承真實伺服器的回傳 Header，並強制加上跨域允許
        const resHeaders = new Headers(response.headers);
        resHeaders.set('Access-Control-Allow-Origin', '*');
        resHeaders.set('Access-Control-Allow-Headers', '*');

        return new Response(response.body, {
            status: response.status,
            headers: resHeaders
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
    }
}
