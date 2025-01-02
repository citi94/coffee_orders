const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    try {
        // Step 1: Get access token following the documented approach
        const tokenResponse = await fetch('https://oauth.zettle.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'client_id': process.env.ZETTLE_CLIENT_ID,
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
                    stage: 'getting_token',
                    message: 'Failed to get access token',
                    details: tokenText,
                    debug: {
                        statusCode: tokenResponse.status,
                        requestDetails: {
                            endpoint: 'oauth.zettle.com/token',
                            grantType: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                            clientIdLength: process.env.ZETTLE_CLIENT_ID?.length,
                            assertionLength: process.env.ZETTLE_CLIENT_SECRET?.length
                        }
                    },
                    timestamp: new Date().toISOString()
                })
            };
        }

        const { access_token } = JSON.parse(tokenText);

        // Step 2: Use the access token to get orders
        const ordersResponse = await fetch(
            'https://purchase.izettle.com/purchases/v2', 
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`
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
                    tokenUsed: access_token.substring(0, 10) + '...',
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