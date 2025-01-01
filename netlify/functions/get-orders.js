const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const clientId = process.env.ZETTLE_CLIENT_ID;
    const clientSecret = process.env.ZETTLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return new Response("Missing Zettle API credentials.", { status: 500 });
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    let response = new Response(null, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
        },
        status: 200
    });

    response.body = new ReadableStream({
        async start(controller) {
            try {
                while (true) {
                    const res = await fetch('https://api.zettle.com/v1/orders', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Basic ${auth}`
                        }
                    });

                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }

                    const data = await res.json();

                    // Send each order as a separate event
                    data.orders.forEach(order => {
                        controller.enqueue(`data: ${JSON.stringify(order)}\n\n`);
                    });

                    // Wait before fetching new orders
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (error) {
                controller.error(error);
            } finally {
                controller.close();
            }
        }
    });

    return response;
};