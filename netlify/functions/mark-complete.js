const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  try {
    const { orderId, source } = JSON.parse(event.body);

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing orderId' }),
      };
    }

    // Handle custom orders - send completion to Custom API
    if (source === 'custom' && process.env.CUSTOM_API_URL && process.env.CUSTOM_API_KEY) {
      try {
        const response = await fetch(`${process.env.CUSTOM_API_URL}/orders-complete`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.CUSTOM_API_KEY
          },
          body: JSON.stringify({ id: orderId })
        });

        if (!response.ok) {
          console.error('Custom API complete failed:', response.status, response.statusText);
          // Don't fail the request - frontend still tracks completion locally
          // But log the error
          const errorData = await response.json().catch(() => ({}));
          console.error('Custom API error details:', errorData);
        } else {
          console.log('Successfully marked custom order as complete:', orderId);
        }
      } catch (error) {
        console.error('Error calling Custom API complete:', error);
        // Don't fail the request - frontend completion tracking still works
      }
    }

    // For Zettle orders, no API call needed (Zettle doesn't support completion via API)
    // Completion is tracked client-side only via localStorage

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        message: 'Order marked as complete',
        orderId: orderId,
        source: source || 'unknown'
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
