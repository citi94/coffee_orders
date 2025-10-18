const fetch = require('node-fetch');

// Configure shop timezone (change if needed)
const SHOP_TIMEZONE = process.env.SHOP_TIMEZONE || 'America/New_York';

/**
 * Fetch orders from Zettle POS API
 */
async function fetchZettleOrders() {
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
      console.error('Zettle token request failed:', tokenResponse.status, errorData);
      throw new Error(`Zettle authentication failed: ${errorData.error || tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      throw new Error('No access token received from Zettle');
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
      console.error('Zettle purchases API failed:', ordersResponse.status, ordersResponse.statusText);
      throw new Error(`Failed to fetch Zettle orders: ${ordersResponse.status} ${ordersResponse.statusText}`);
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
        source: 'zettle',
        orderNumber: purchase.purchaseNumber || 'Unknown',
        time: new Date(purchase.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        timestamp: purchase.timestamp,
        items: purchase.products.map(product => ({
          name: product.name || 'Unknown Item',
          quantity: product.quantity || 1,
          variant: product.variantName || '',
          comment: product.comment || ''
        })),
        completed: false
      }));

    return formattedOrders;
  } catch (error) {
    console.error('Error fetching Zettle orders:', error);
    throw error;
  }
}

/**
 * Fetch orders from Custom Orders API
 */
async function fetchCustomOrders() {
  // If custom API URL not configured, return empty array
  if (!process.env.CUSTOM_API_URL) {
    console.log('CUSTOM_API_URL not configured, skipping custom orders');
    return [];
  }

  try {
    const response = await fetch(`${process.env.CUSTOM_API_URL}/orders-get-today`, {
      headers: {
        'X-API-Key': process.env.CUSTOM_API_KEY || ''
      }
    });

    if (!response.ok) {
      console.error('Custom API failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch custom orders: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      console.error('Custom API returned error:', data.error);
      throw new Error(`Custom API error: ${data.error}`);
    }

    // Format custom orders to match display format
    const formattedOrders = (data.orders || []).map(order => ({
      id: order.id,
      source: 'custom',
      orderNumber: order.orderNumber,
      time: order.time || new Date(order.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      timestamp: order.timestamp,
      items: order.items,
      // Additional metadata from custom orders
      customerName: order.customerName || null,
      tableNumber: order.tableNumber || null,
      orderType: order.orderType || null,
      phoneNumber: order.phoneNumber || null,
      notes: order.notes || null,
      completed: order.completed || false
    }));

    return formattedOrders;
  } catch (error) {
    console.error('Error fetching custom orders:', error);
    throw error;
  }
}

/**
 * Main handler - fetches from both APIs in parallel
 */
exports.handler = async function (event, context) {
  try {
    // Fetch from both APIs in parallel using Promise.allSettled
    // This allows one API to fail without blocking the other
    const [zettleResult, customResult] = await Promise.allSettled([
      fetchZettleOrders(),
      fetchCustomOrders()
    ]);

    // Extract orders from successful fetches
    const zettleOrders = zettleResult.status === 'fulfilled' ? zettleResult.value : [];
    const customOrders = customResult.status === 'fulfilled' ? customResult.value : [];

    // Log any failures (but don't fail the entire request)
    if (zettleResult.status === 'rejected') {
      console.error('Zettle API failed:', zettleResult.reason);
    }
    if (customResult.status === 'rejected') {
      console.error('Custom API failed:', customResult.reason);
    }

    // Merge orders from both sources
    const allOrders = [...zettleOrders, ...customOrders];

    // Sort by timestamp (newest first)
    allOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        orders: allOrders,
        sources: {
          zettle: zettleOrders.length,
          custom: customOrders.length,
          total: allOrders.length,
          zettleStatus: zettleResult.status,
          customStatus: customResult.status
        },
        lastUpdated: new Date().toLocaleTimeString(),
      }),
    };
  } catch (error) {
    // This should only happen if there's a catastrophic error
    // Individual API failures are handled above
    console.error('Fatal error in get-orders:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
