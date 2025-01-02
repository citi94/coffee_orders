const fs = require('fs');
const path = require('path');

exports.handler = async function (event, context) {
  try {
    const filePath = path.join(__dirname, 'completed_orders.json');
    
    // Read the JSON file
    let completedOrders = [];
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      // Handle empty or whitespace-only content
      if (fileContent.trim()) {
        completedOrders = JSON.parse(fileContent);
      }
    } catch (err) {
      if (err.code === 'ENOENT' || err instanceof SyntaxError) {
        // File doesn't exist or is invalid JSON, create it with an empty array
        await fs.promises.writeFile(filePath, JSON.stringify([], null, 2));
      } else {
        throw err;
      }
    }

    // Ensure completedOrders is always an array
    if (!Array.isArray(completedOrders)) {
      completedOrders = [];
      // Fix the file content
      await fs.promises.writeFile(filePath, JSON.stringify([], null, 2));
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