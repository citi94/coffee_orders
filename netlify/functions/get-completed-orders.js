exports.handler = async function (event, context) {
  try {
    // Get completed orders from KV store
    const completedOrders = await context.store.get('completedOrders') || [];

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        completedOrders: completedOrders,
      }),
    };
  } catch (error) {
    console.error('Error fetching completed orders:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'Error fetching completed orders: ' + error.message,
      })
    };
  }
};