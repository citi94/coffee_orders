exports.handler = async function(event, context) {
    try {
        // Debug environment variables
        const envDebug = {
            hasClientId: !!process.env.ZETTLE_CLIENT_ID,
            hasClientSecret: !!process.env.ZETTLE_CLIENT_SECRET,
            clientIdLength: process.env.ZETTLE_CLIENT_ID ? process.env.ZETTLE_CLIENT_ID.length : 0,
            secretLength: process.env.ZETTLE_CLIENT_SECRET ? process.env.ZETTLE_CLIENT_SECRET.length : 0,
            // Show first few characters of each (safely)
            clientIdPrefix: process.env.ZETTLE_CLIENT_ID ? process.env.ZETTLE_CLIENT_ID.substring(0, 4) + '...' : 'not set',
            secretPrefix: process.env.ZETTLE_CLIENT_SECRET ? process.env.ZETTLE_CLIENT_SECRET.substring(0, 4) + '...' : 'not set',
        };

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Environment Variable Debug Info",
                debug: envDebug,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Error occurred",
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};