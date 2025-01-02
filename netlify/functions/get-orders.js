const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    try {
        // Step 1: Get access token
        const tokenResponse = await fetch('https://oauth.zettle.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'client_id': process.env.ZETTLE_CLIENT_ID,
                'assertion': process.env.ZETTLE_CLIENT_SECRET
            }).toString()
        });

        if (!tokenResponse.ok) {
            const tokenText = await tokenResponse.text();
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'error',
                    stage: 'getting_token',
                    message: 'Failed to get access token',
                    details: tokenText,
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
            const ordersText = await ordersResponse.text();
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'error',
                    stage: 'fetching_orders',
                    message: 'Failed to fetch orders',
                    details: ordersText,
                    timestamp: new Date().toISOString()
                })
            };
        }

        const { purchases } = await ordersResponse.json();

        // Process and format orders
        const formattedOrders = (purchases || []).map(purchase => {
            // Format timestamp to local time
            const orderTime = new Date(purchase.timestamp);
            
            // Calculate time ago
            const now = new Date();
            const minutesAgo = Math.floor((now - orderTime) / (1000 * 60));
            const timeAgo = minutesAgo < 60 
                ? `${minutesAgo} minutes ago`
                : `${Math.floor(minutesAgo / 60)} hours ago`;

            return {
                id: purchase.purchaseNumber || 'Unknown',
                timestamp: orderTime.toLocaleTimeString(),
                timeAgo: timeAgo,
                items: purchase.products.map(product => ({
                    name: product.name,
                    quantity: product.quantity,
                    unitPrice: (product.unitPrice / 100).toFixed(2)
                })),
                status: purchase.status.toLowerCase(),
                total: (purchase.amount / 100).toFixed(2),
                paymentType: purchase.payments?.[0]?.type || 'Unknown'
            };
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Most recent first

        // Calculate some stats
        const stats = {
            totalOrders: formattedOrders.length,
            totalRevenue: formattedOrders.reduce((sum, order) => sum + parseFloat(order.total), 0).toFixed(2),
            averageOrderValue: (formattedOrders.reduce((sum, order) => sum + parseFloat(order.total), 0) / 
                              (formattedOrders.length || 1)).toFixed(2)
        };

        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'success',
                stats: stats,
                orders: formattedOrders,
                lastUpdated: new Date().toLocaleTimeString(),
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