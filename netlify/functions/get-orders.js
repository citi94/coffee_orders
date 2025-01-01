const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    try {
        // Attempt OAuth token request with client_credentials grant type
        const tokenResponse = await fetch('https://oauth.zettle.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.ZETTLE_CLIENT_ID,
                client_secret: process.env.ZETTLE_CLIENT_SECRET
            }).toString()
        });

        const responseText = await tokenResponse.text();
        console.log('Raw response:', responseText);

        if (!tokenResponse.ok) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'error',
                    stage: 'authentication',
                    message: 'Failed to get access token',
                    details: responseText,
                    debug: {
                        statusCode: tokenResponse.status,
                        headers: Object.fromEntries(tokenResponse.headers.entries()),
                        requestInfo: {
                            grantType: 'client_credentials',
                            clientIdUsed: process.env.ZETTLE_CLIENT_ID?.substring(0, 8) + '...',
                            secretLength: process.env.ZETTLE_CLIENT_SECRET?.length
                        }
                    },
                    timestamp: new Date().toISOString()
                })
            };
        }

        let tokenData;
        try {
            tokenData = JSON.parse(responseText);
        } catch (e) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'error',
                    stage: 'parsing',
                    message: 'Failed to parse token response',
                    rawResponse: responseText,
                    timestamp: new Date().toISOString()
                })
            };
        }

        // Test response before proceeding
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'success',
                stage: 'authentication',
                tokenReceived: !!tokenData.access_token,
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
