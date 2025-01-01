const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const clientId = process.env.ZETTLE_CLIENT_ID;
    const clientSecret = process.env.ZETTLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Missing Zettle API credentials.",
                timestamp: new Date().toISOString()
            })
        };
    }

    // Set up SSE headers
    const headers = new Headers();
    headers.append('Content-Type', 'text/event-stream');
    headers.append('Cache-Control', 'no-cache');
    headers.append('Connection', 'keep-alive');

    return new Response(
        new EventSource(async (event) => {
            try {
                // Fetch orders from Zettle
                const response = await fetch('https://api.zettle.com/v1/orders', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                event.send(`data: ${JSON.stringify(data)}\n\n`);

            } catch (error) {
                event.send(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            }
        }),
        { headers }
    );
};