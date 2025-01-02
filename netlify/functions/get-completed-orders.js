const faunadb = require('faunadb');
const q = faunadb.query;
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET,
  keepAlive: false // Force older connection handling
});

exports.handler = async function (event, context) {
  try {
    // Most basic query possible
    const result = await client.query(
      q.Paginate(
        q.Match(
          q.Index('completed_orders_by_id')
        )
      )
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        completedOrders: result.data || [],
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