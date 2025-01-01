const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    try {
        // Try direct API access first with the API key
        const ordersResponse = await fetch(
            'https://purchase.izettle.com/purchases/v2',
            {
                headers: {
                    'Authorization': `Bearer ${process.env.ZETTLE_CLIENT_SECRET}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        const responseText = await ordersResponse.text();
        console.log('API Response:', responseText);

        if (!ordersResponse.ok) {
            // Try alternative endpoint if first one fails
            const altResponse = await fetch(
                'https://login.zettle.com/api/oauth/v2/token',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: new URLSearchParams({
                        grant_type: 'assertion',
                        assertion: process.env.ZETTLE_CLIENT_SECRET,
                        scope: 'READ:PURCHASE READ:USERINFO READ:PRODUCT READ:FINANCE'
                    }).toString()
                }
            );

            const altText = await altResponse.text();
            console.log('Alternative endpoint response:', altText);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'debug',
                    message: 'Testing alternative authentication',
                    firstTry: {
                        status: ordersResponse.status,
                        response: responseText
                    },
                    secondTry: {
                        status: altResponse.status,
                        response: altText
                    },
                    debug: {
                        apiKeyLength: process.env.ZETTLE_CLIENT_SECRET?.length,
                        clientIdPresent: !!process.env.ZETTLE_CLIENT_ID
                    },
                    timestamp: new Date().toISOString()
                })
            };
        }

        const ordersData = JSON.parse(responseText);

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