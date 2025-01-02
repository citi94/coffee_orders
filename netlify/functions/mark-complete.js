const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const COMPLETED_ORDERS_FILE = path.join(__dirname, 'completed_orders.json'); // File to store completed IDs

// Helper function to read completed orders from file
const getCompletedOrders = async () => {
  try {
    if (fs.existsSync(COMPLETED_ORDERS_FILE)) {
      const data = fs.readFileSync(COMPLETED_ORDERS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading completed orders:', error);
    return [];
  }
};

// Helper function to write completed orders to file
const saveCompletedOrders = async (completedOrders) => {
  try {
    fs.writeFileSync(COMPLETED_ORDERS_FILE, JSON.stringify(completedOrders));
  } catch (error) {
    console.error('Error writing completed orders:', error);
    throw error; // Re-throw to indicate failure
  }
};

exports.handler = async (event, context) => {
  try {
    const { orderId } = JSON.parse(event.body);

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing orderId' }),
      };
    }

    const completedOrders = await getCompletedOrders();
    if (!completedOrders.includes(orderId)) {
      completedOrders.push(orderId);
      await saveCompletedOrders(completedOrders);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Order marked as complete' }),
    };
  } catch (error) {
    console.error('Error marking order complete:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error marking order as complete' }),
    };
  }
};