const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

exports.handler = async function(event, context) {
    try {
        // Generate JWT assertion
        const assertion = jwt.sign(
            {
                iss: process.env.ZETTLE_CLIENT_ID,
                sub: process.env.ZETTLE_CLIENT_ID,
                aud: 'https://oauth.zettle.com/token',
                exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
            },
            process.env.ZETTLE_CLIENT_SECRET
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

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Connection successful.",
                orders: orders.purchases || [],
                timestamp: new Date().toISOString()
            })
        };

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