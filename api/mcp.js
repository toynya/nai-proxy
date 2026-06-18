export const config = {
    runtime: 'edge', 
};

export default async function handler(req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        // ⚠️ 核心關鍵：必須暴露 mcp-session-id 讓瀏覽器前端可以讀取
        'Access-Control-Expose-Headers': 'mcp-session-id, content-type', 
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('target') || req.headers.get('x-target-url');

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing target URL' }), { 
            status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
    }

    try {
        const body = (req.method !== 'GET' && req.method !== 'HEAD') ? await req.text() : undefined;
        
        const headers = new Headers();
        // ⚠️ 將前端傳來的特殊 Header 原封不動轉發給 HF
        ['Accept', 'Authorization', 'Content-Type', 'mcp-session-id'].forEach(h => {
            if (req.headers.has(h)) headers.set(h, req.headers.get(h));
        });

        const response = await fetch(targetUrl, {
            method: req.method,
            headers,
            body
        });

        const resHeaders = new Headers(response.headers);
        resHeaders.set('Access-Control-Allow-Origin', '*');
        resHeaders.set('Access-Control-Allow-Headers', '*');
        resHeaders.set('Access-Control-Expose-Headers', 'mcp-session-id, content-type');
        resHeaders.delete('content-encoding');

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
