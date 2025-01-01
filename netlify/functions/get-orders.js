const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    try {
        // Create basic auth string
        const credentials = Buffer.from(`${process.env.ZETTLE_CLIENT_ID}:${process.env.ZETTLE_CLIENT_SECRET}`).toString('base64');

        // Attempt OAuth token request with Basic Auth
        const tokenResponse = await fetch('https://oauth.zettle.com/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
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
                            authType: 'Basic',
                            clientIdUsed: process.env.ZETTLE_CLIENT_ID?.substring(0, 8) + '...',
                            credentialsLength: credentials.length,
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