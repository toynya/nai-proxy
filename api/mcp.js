export const config = {
    runtime: 'edge', // 必須使用 edge 才能支援無中斷串流
};

export default async function handler(req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
        'Access-Control-Allow-Headers': '*',
    };

    // 完美處理瀏覽器預檢請求
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    // 從 Header 讀取真實目的地網址
    const targetUrl = req.headers.get('x-target-url');

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing x-target-url header' }), { 
            status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
    }

    try {
        const body = (req.method === 'POST' || req.method === 'PUT') ? await req.text() : undefined;
        
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Accept': req.headers.get('Accept') || '*/*',
                'Content-Type': req.headers.get('Content-Type') || 'application/json',
            },
            body
        });

        // 將對方的回傳原封不動交給前端，並強制覆寫 CORS 允許跨域
        const resHeaders = new Headers(response.headers);
        resHeaders.set('Access-Control-Allow-Origin', '*');
        resHeaders.set('Access-Control-Allow-Headers', '*');
        resHeaders.delete('content-encoding'); // 避免瀏覽器重複解碼報錯

        return new Response(response.body, {
            status: response.status,
            headers: resHeaders
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
    }
}
