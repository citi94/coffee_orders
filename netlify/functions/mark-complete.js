exports.handler = async (event, context) => {
  try {
    const { orderId } = JSON.parse(event.body);

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing orderId' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        status: 'success',
        message: 'Order marked as complete',
        orderId: orderId
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