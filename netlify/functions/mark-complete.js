const faunadb = require('faunadb');
const q = faunadb.query;
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET,
  keepAlive: false // Force older connection handling
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

    // Most basic create syntax possible
    const data = { orderId: orderId };
    await client.query(
      q.Create(
        q.Collection('completed_orders'),
        { data }
      )
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Order marked as complete' }),
    };
  } catch (error) {
    console.error('Error marking order complete:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error marking order as complete: ' + error.message }),
    };
  }
};