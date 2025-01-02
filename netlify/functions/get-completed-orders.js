const fs = require('fs');
const path = require('path');

exports.handler = async function (event, context) {
  try {
    const filePath = path.join(__dirname, 'completed_orders.json');
    
    // Read the JSON file
    let completedOrders = [];
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      completedOrders = JSON.parse(fileContent);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist yet, that's fine
        await fs.promises.writeFile(filePath, JSON.stringify([], null, 2));
      } else {
        throw err;
      }
    }

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