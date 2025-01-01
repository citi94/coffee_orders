exports.handler = async function(event, context) {
    try {
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
            const tokenError = await tokenResponse.text();
            console.log('Token Error:', tokenError);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'error',
                    stage: 'authentication',
                    message: 'Failed to get access token',
                    details: tokenError,
                    timestamp: new Date().toISOString()
                })
            };
        }

        const { access_token } = await tokenResponse.json();
        console.log('Got access token successfully');

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
            const ordersError = await ordersResponse.text();
            console.log('Orders Error:', ordersError);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'error',
                    stage: 'fetching_orders',
                    message: 'Failed to fetch orders',
                    details: ordersError,
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

        console.log(`Successfully processed ${processedOrders.length} orders`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'success',
                orders: processedOrders,
                orderCount: processedOrders.length,
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
