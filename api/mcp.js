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

    // 從網址參數取得真實目的地，避開自訂 Header 被攔截的問題
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('target') || req.headers.get('x-target-url');

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing target URL parameter' }), { 
            status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
    }

    try {
        const isGet = req.method === 'GET' || req.method === 'HEAD';
        const body = isGet ? undefined : await req.text();
        
        const headers = new Headers();
        
        // 複製重要的 Headers
        ['Accept', 'Authorization'].forEach(h => {
            if (req.headers.has(h)) headers.set(h, req.headers.get(h));
        });

        // ⚠️關鍵修正：只有非 GET 請求才加上 Content-Type，否則會觸發 400 Bad Request
        if (!isGet) {
            headers.set('Content-Type', req.headers.get('Content-Type') || 'application/json');
        }

        const response = await fetch(targetUrl, {
            method: req.method,
            headers,
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
