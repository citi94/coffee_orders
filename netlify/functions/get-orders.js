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

        // Adjust date range to last 7 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const ordersResponse = await fetch(
            `https://purchase.izettle.com/purchases/v2?startDate=${startDate.toISOString()}`, 
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            }
        );

        if (!ordersResponse.ok) {
            const ordersText = await ordersResponse.text();
            console.log('Orders API Response:', ordersText);
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

        // Log raw purchases for debugging
        console.log('Raw Purchases:', JSON.stringify(purchases, null, 2));

        // Process and format orders
        const formattedOrders = (purchases || []).map(purchase => {
            // Ensure purchase has required fields
            if (!purchase || !purchase.timestamp || !purchase.products || !purchase.amount) {
                console.warn('Skipping invalid purchase:', purchase);
                return null;
            }

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
                status: purchase.status ? purchase.status.toLowerCase() : 'unknown', // Handle missing status
                total: (purchase.amount / 100).toFixed(2),
                paymentType: purchase.payments?.[0]?.type || 'Unknown'
            };
        }).filter(order => order !== null) // Remove invalid purchases
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Most recent first

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