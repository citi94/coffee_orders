const { fetch } = require('node-fetch');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

exports.handler = async function(event, context) {
    try {
        console.log('Starting function execution');

        // Decode the base64 encoded private key
        const privateKey = Buffer.from(process.env.ZETTLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
        console.log('Private key decoded');

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
        console.log('JWT assertion generated');

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

        if (!tokenResponse.ok) {
            const tokenError = await tokenResponse.json();
            console.error('Token request failed:', tokenError);
            throw new Error(`Failed to get access token: ${tokenError.error_description}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('Access token received');
        const accessToken = tokenData.access_token;

        // Step 2: Fetch orders using the access token
        const ordersResponse = await fetch('https://purchase.izettle.com/purchases/v2', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!ordersResponse.ok) {
            const ordersError = await ordersResponse.json();
            console.error('Orders request failed:', ordersError);
            throw new Error(`Failed to fetch orders: ${ordersError.error_description}`);
        }

        const orders = await ordersResponse.json();
        console.log('Orders fetched successfully:', orders);

        return {
            statusCode: 200,
            body: JSON.stringify({ orders: orders.purchases || [] })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};