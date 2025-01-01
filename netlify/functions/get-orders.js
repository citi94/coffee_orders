const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    try {
        // Debug log to check exact format of credentials
        console.log('Client ID length:', process.env.ZETTLE_CLIENT_ID?.length);
        console.log('Client Secret length:', process.env.ZETTLE_CLIENT_SECRET?.length);

        // Create auth string and encode it
        const authString = Buffer.from(
            `${process.env.ZETTLE_CLIENT_ID}:${process.env.ZETTLE_CLIENT_SECRET}`
        ).toString('base64');

        // Get Zettle access token using basic auth
        const tokenResponse = await fetch('https://oauth.zettle.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authString}`
            },
            body: 'grant_type=client_credentials'
        });

        // Log the response headers for debugging
        console.log('Response status:', tokenResponse.status);
        const responseHeaders = {};
        tokenResponse.headers.forEach((value, name) => {
            responseHeaders[name] = value;
        });
        console.log('Response headers:', responseHeaders);

        if (!tokenResponse.ok) {
            const tokenError = await tokenResponse.text();
            console.log('Token Error Response:', tokenError);
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'error',
                    stage: 'authentication',
                    message: 'Failed to get access token',
                    details: tokenError,
                    debug: {
                        responseStatus: tokenResponse.status,
                        responseHeaders: responseHeaders,
                        authStringLength: authString.length
                    },
                    timestamp: new Date().toISOString()
                })
            };
        }

        const tokenData = await tokenResponse.json();
        console.log('Token response:', JSON.stringify(tokenData));

        // Rest of the code remains the same...
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'debug',
                message: 'Testing authentication',
                tokenData: tokenData,
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
