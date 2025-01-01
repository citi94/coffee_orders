const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    try {
        // Get access token using assertion grant flow
        const tokenResponse = await fetch('https://oauth.zettle.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion': process.env.ZETTLE_CLIENT_SECRET
            }).toString()
        });

        const tokenText = await tokenResponse.text();
        console.log('Token response:', tokenText);

        if (!tokenResponse.ok) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'error',
                    stage: 'authentication',
                    message: 'Failed to get access token',
                    details: tokenText,
                    debug: {
                        statusCode: tokenResponse.status,
                        headers: Object.fromEntries(tokenResponse.headers.entries())
                    },
                    timestamp: new Date().toISOString()
                })
            };
        }

        const { access_token } = JSON.parse(tokenText);

        // Get today's orders using the access token
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const ordersResponse = await fetch(
            `https://purchase.izettle.com/purchases/v2?startDate=${startOfDay.toISOString()}`,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const ordersText = await ordersResponse.text();
        console.log('Orders response:', ordersText);

        if (!ordersResponse.ok) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'error',
                    stage: 'fetching_orders',
                    message: 'Failed to fetch orders',
                    details: ordersText,
                    timestamp: new Date().toISOString()
                })
            };
        }

        const ordersData = JSON.parse(ordersText);

        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'success',
                orders: ordersData.purchases || [],
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.log('Function Error:', error);
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'error',
                stage: 'processing',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};