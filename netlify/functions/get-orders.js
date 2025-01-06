const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  try {
    console.log('Starting get-orders function');
    
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

    const tokenData = await tokenResponse.json();
    console.log('Token response received:', tokenData.access_token ? 'Token obtained' : 'No token');
    const { access_token } = tokenData;

    // Get today's start time
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    console.log('Fetching purchases and orders...');

    // Fetch purchases first
    const purchasesResponse = await fetch(
      `https://purchase.izettle.com/purchases/v2?startDate=${startOfDay.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }
    );
    
    const purchasesData = await purchasesResponse.json();
    console.log('Purchases response:', {
      status: purchasesResponse.status,
      purchaseCount: purchasesData.purchases ? purchasesData.purchases.length : 0
    });

    // Try to fetch orders
    try {
      console.log('Attempting to fetch orders from v3 API...');
      const ordersResponse = await fetch(
        'https://purchase.izettle.com/v3/orders',
        {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        }
      );
      
      const ordersData = await ordersResponse.json();
      console.log('Orders response:', {
        status: ordersResponse.status,
        responseType: typeof ordersData,
        data: ordersData
      });

      // Format purchases
      const formattedPurchases = (purchasesData.purchases || []).map(purchase => ({
        id: purchase.purchaseUUID,
        orderNumber: purchase.purchaseNumber || 'Unknown',
        time: new Date(purchase.timestamp).toLocaleTimeString(),
        timestamp: purchase.timestamp,
        items: purchase.products.map(product => ({
          name: product.name,
          quantity: product.quantity,
          variant: product.variantName || '',
          comment: product.comment || ''
        })),
        type: 'purchase',
        status: 'COMPLETED'
      }));

      // Format open orders (if we got any)
      const formattedOrders = Array.isArray(ordersData.orders) ? 
        ordersData.orders
          .filter(order => order.status === 'OPEN')
          .map(order => ({
            id: order.orderId,
            orderNumber: order.orderNumber || 'Open Order',
            time: new Date(order.created).toLocaleTimeString(),
            timestamp: order.created,
            items: order.items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              variant: item.variantName || '',
              comment: item.comment || ''
            })),
            type: 'open_order',
            status: 'OPEN',
            tableNumber: order.tableNumber
          })) : [];

      // Combine and sort all orders
      const allOrders = [...formattedPurchases, ...formattedOrders]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      console.log('Final response:', {
        purchaseCount: formattedPurchases.length,
        openOrderCount: formattedOrders.length,
        totalOrders: allOrders.length
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'success',
          orders: allOrders,
          lastUpdated: new Date().toLocaleTimeString(),
        }),
      };

    } catch (ordersError) {
      console.error('Error fetching orders:', ordersError);
      
      // If orders fetch fails, still return purchases
      const formattedPurchases = (purchasesData.purchases || []).map(purchase => ({
        id: purchase.purchaseUUID,
        orderNumber: purchase.purchaseNumber || 'Unknown',
        time: new Date(purchase.timestamp).toLocaleTimeString(),
        timestamp: purchase.timestamp,
        items: purchase.products.map(product => ({
          name: product.name,
          quantity: product.quantity,
          variant: product.variantName || '',
          comment: product.comment || ''
        })),
        type: 'purchase',
        status: 'COMPLETED'
      }));

      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'success',
          orders: formattedPurchases,
          lastUpdated: new Date().toLocaleTimeString(),
          ordersFetchError: ordersError.message
        }),
      };
    }

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