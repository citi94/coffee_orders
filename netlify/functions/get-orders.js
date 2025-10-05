const fetch = require('node-fetch');

// Configure shop timezone (change if needed)
const SHOP_TIMEZONE = 'America/New_York'; // Eastern Time

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

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Token request failed:', tokenResponse.status, errorData);
      throw new Error(`Authentication failed: ${errorData.error || tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      throw new Error('No access token received from authentication service');
    }
    const { access_token } = tokenData;

    // Get today's orders using shop's timezone
    const now = new Date();
    const shopDate = new Date(now.toLocaleString('en-US', { timeZone: SHOP_TIMEZONE }));
    const startOfDay = new Date(shopDate);
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
      console.error('Purchases API failed:', ordersResponse.status, ordersResponse.statusText);
      throw new Error(`Failed to fetch orders: ${ordersResponse.status} ${ordersResponse.statusText}`);
    }

    const ordersData = await ordersResponse.json();
    const { purchases } = ordersData;

    // Format orders for barista display with validation
    const formattedOrders = (purchases || [])
      .filter(purchase => {
        // Validate purchase has required fields
        if (!purchase || !purchase.purchaseUUID) {
          console.warn('Invalid purchase object:', purchase);
          return false;
        }
        if (!purchase.products || !Array.isArray(purchase.products)) {
          console.warn('Purchase missing products array:', purchase.purchaseUUID);
          return false;
        }
        if (purchase.products.length === 0) {
          console.warn('Purchase has empty products array:', purchase.purchaseUUID);
          return false;
        }
        return true;
      })
      .map(purchase => ({
        id: purchase.purchaseUUID,
        orderNumber: purchase.purchaseNumber || 'Unknown',
        time: new Date(purchase.timestamp).toLocaleTimeString(),
        timestamp: purchase.timestamp,
        items: purchase.products.map(product => ({
          name: product.name || 'Unknown Item',
          quantity: product.quantity || 1,
          variant: product.variantName || '',
          comment: product.comment || ''
        })),
        completed: false
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Most recent first

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        orders: formattedOrders, // Return all orders from Zettle
        lastUpdated: new Date().toLocaleTimeString(),
      }),
    };
  } catch (error) {
    console.error('Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        stage: 'processing',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};