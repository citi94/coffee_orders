const fetch = require('node-fetch');
const faunadb = require('faunadb');

const q = faunadb.query;
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET,
});

exports.handler = async function (event, context) {
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
        comment: product.comment || ''      // Any special instructions
      })),
      completed: false  // Add a completed flag for baristas to check off
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Most recent first

    // Get completed order IDs from FaunaDB
    let completedOrders = [];
    try {
      const completedOrdersResponse = await client.query(
        q.Map(
          q.Paginate(q.Documents(q.Collection('completed_orders'))),
          q.Lambda('ref', q.Select(['data', 'orderId'], q.Get(q.Var('ref'))))
        )
      );
      completedOrders = completedOrdersResponse.data;
    } catch (error) {
      if (error.name === 'NotFound') {
        console.log('completed_orders collection not found, likely first use.');
      } else {
        throw error; // Re-throw other errors to be handled in the outer catch block
      }
    }

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
    console.error('Function Error:', error);
    return {
      statusCode: 500, // Changed from 200 to 500 to indicate an error
      body: JSON.stringify({
        status: 'error',
        stage: 'processing',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};