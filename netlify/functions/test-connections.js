// test-connection.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const clientId = process.env.ZETTLE_CLIENT_ID;
    const clientSecret = process.env.ZETTLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Missing Zettle API credentials." })
        };
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const response = await fetch('https://api.zettle.com/v1/orders', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Connection successful." })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Connection failed: " + error.message })
        };
    }
};