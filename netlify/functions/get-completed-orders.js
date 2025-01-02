exports.handler = async function (event, context) {
  try {
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        message: 'Ready to receive completed orders'
      }),
    };
  } catch (error) {
    console.error('Error with completed orders endpoint:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: error.message,
      })
    };
  }
};