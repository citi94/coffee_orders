exports.handler = async function(event, context) {
    try {
        // First check if we have our environment variables
        if (!process.env.ZETTLE_CLIENT_ID || !process.env.ZETTLE_CLIENT_SECRET) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Zettle credentials not configured yet",
                    isTest: true,
                    timestamp: new Date().toISOString()
                })
            };
        }

        // Get Zettle access token
        const tokenResponse = await fetch('https://oauth.zettle.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(
                    `${process.env.ZETTLE_CLIENT_ID}:${process.env.ZETTLE_CLIENT_SECRET}`
                ).toString('base64')}`
            },
            body: 'grant_type=client_credentials'
        });

        if (!tokenResponse.ok) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Zettle auth failed - check credentials",
                    error: await tokenResponse.text(),
                    timestamp: new Date().toISOString()
                })
            };
        }

        const { access_token } = await tokenResponse.json();

        // Get today's orders
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const ordersResponse = await fetch(
            `https://purchase.izettle.com/purchases/v2?startDate=${startOfDay.toISOString()}`,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            }
        );

        if (!ordersResponse.ok) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Connected to Zettle but couldn't fetch orders",
                    error: await ordersResponse.text(),
                    timestamp: new Date().toISOString()
                })
            };
        }

        const { purchases } = await ordersResponse.json();

        // Process orders
        const processedOrders = purchases ? purchases.map(purchase => ({
            id: purchase.purchaseNumber || 'Unknown',
            items: purchase.products ? purchase.products.map(product => product.name || 'Unknown Item') : [],
            status: (purchase.status || 'unknown').toLowerCase(),
            timestamp: purchase.timestamp || new Date().toISOString(),
            total: (purchase.amount || 0) / 100 // Convert from cents to dollars
        })) : [];

        return {
            statusCode: 200,
            body: JSON.stringify({
                orders: processedOrders,
                message: "Successfully fetched orders from Zettle",
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