const { fetch } = require('node-fetch');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

exports.handler = async function(event, context) {
    const query = new URLSearchParams(event.queryStringParameters || {});
    const isTest = query.get('test') === 'true';

    try {
        // Decode the base64 encoded private key
        const privateKey = Buffer.from(process.env.ZETTLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');

        // Generate JWT assertion
        const assertion = jwt.sign(
            {
                iss: process.env.ZETTLE_CLIENT_ID,
                sub: process.env.ZETTLE_CLIENT_ID,
                aud: 'https://oauth.zettle.com/token',
                exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
                jti: uuidv4()
            },
            privateKey,
            { algorithm: 'RS256' }
        );

        // Step 1: Get access token
        const tokenResponse = await fetch('https://oauth.zettle.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'client_id': process.env.ZETTLE_CLIENT_ID,
                'assertion': assertion
            }).toString()
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            throw new Error(`Failed to get access token: ${tokenData.error_description}`);
        }

        const accessToken = tokenData.access_token;

        if (isTest) {
            // For test connection, return success message without fetching orders
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Connection successful.",
                    timestamp: new Date().toISOString()
                })
            };
        }

        // Step 2: Fetch orders using the access token
        const ordersResponse = await fetch('https://purchase.izettle.com/purchases/v2', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!ordersResponse.ok) {
            const ordersError = await ordersResponse.json();
            throw new Error(`Failed to fetch orders: ${ordersError.error_description}`);
        }

        const orders = await ordersResponse.json();

        // Set up SSE response
        return new Response(null, {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            },
            body: new ReadableStream({
                async start(controller) {
                    // Simulate real-time order updates
                    setInterval(() => {
                        const order = orders.purchases[Math.floor(Math.random() * orders.purchases.length)];
                        controller.enqueue(`data: ${JSON.stringify(order)}\n\n`);
                    }, 5000);
                }
            })
        });

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Connection failed: " + error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};