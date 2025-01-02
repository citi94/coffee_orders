exports.handler = async (event, context) => {
  try {
    const { orderId } = JSON.parse(event.body);

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing orderId' }),
      };
    }

    // Get current completed orders
    let completedOrders = await context.store.get('completedOrders') || [];
    
    // Add new order ID if it's not already there
    if (!completedOrders.includes(orderId)) {
      completedOrders.push(orderId);
      await context.store.set('completedOrders', completedOrders);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        status: 'success',
        message: 'Order marked as complete' 
      }),
    };
  } catch (error) {
    console.error('Error marking order complete:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        status: 'error',
        message: 'Error marking order as complete: ' + error.message 
      }),
    };
  }
};