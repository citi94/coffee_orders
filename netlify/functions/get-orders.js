const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const COMPLETED_ORDERS_FILE = path.join(__dirname, 'completed_orders.json');

// Helper function to read completed orders (same as in mark-complete.js)
const getCompletedOrders = async () => {
  try {
    if (fs.existsSync(COMPLETED_ORDERS_FILE)) {
      const data = fs.readFileSync(COMPLETED_ORDERS_FILE, 'utf8');

      // Check if the file is empty
      if (data.trim() === '') {
        console.log("Completed orders file is empty. Returning empty array.");
        return [];
      }

      try {
        // Attempt to parse JSON, handle potential errors
        const parsedData = JSON.parse(data);
        console.log("Completed orders file found. Data:", parsedData);
        return parsedData;
      } catch (parseError) {
        console.error("Error parsing JSON from completed orders file:", parseError);
        return []; // Return empty array on parse error
      }
    }
    console.log("Completed orders file not found. Returning empty array.");
    return [];
  } catch (error) {
    console.error('Error reading completed orders:', error);
    return [];
  }
};

exports.handler = async function(event, context) {
    try {
        // Get access token
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

        const { purchases } = await ordersResponse.json();

        // Format orders for barista display
        const formattedOrders = (purchases || []).map(purchase => ({
            id: purchase.purchaseUUID,
            orderNumber: purchase.purchaseNumber || 'Unknown',
            time: new Date(purchase.timestamp).toLocaleTimeString(),
            timestamp: purchase.timestamp, // Keep full timestamp for sorting
            items: purchase.products.map(product => ({
                name: product.name,
                quantity: product.quantity,
                variant: product.variantName || '',  // In case drinks have variants
                comment: product.comment || ''       // Any special instructions
            })),
            completed: false  // Add a completed flag for baristas to check off
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Most recent first

        const completedOrders = await getCompletedOrders();

    // Filter out completed orders
    const filteredOrders = formattedOrders.filter(
      (order) => !completedOrders.includes(order.id)
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        orders: filteredOrders, // Return filtered orders
        lastUpdated: new Date().toLocaleTimeString(),
      }),
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