const faunadb = require('faunadb');

const q = faunadb.query;
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET,
});

exports.handler = async (event, context) => {
  try {
    const { orderId } = JSON.parse(event.body);

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing orderId' }),
      };
    }

    // Add the completed order ID to FaunaDB
    await client.query(
      q.Create(q.Collection('completed_orders'), {
        data: { orderId: orderId },
      })
    );

    console.log(`Order ${orderId} marked as complete.`);

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