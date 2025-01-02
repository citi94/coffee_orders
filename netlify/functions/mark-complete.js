const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  try {
    const { orderId } = JSON.parse(event.body);

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing orderId' }),
      };
    }

    const filePath = path.join(__dirname, 'completed_orders.json');
    
    // Read current completed orders
    let completedOrders = [];
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      completedOrders = JSON.parse(fileContent);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    // Add new order ID if it's not already there
    if (!completedOrders.includes(orderId)) {
      completedOrders.push(orderId);
      await fs.promises.writeFile(filePath, JSON.stringify(completedOrders, null, 2));
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