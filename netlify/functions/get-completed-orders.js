const faunadb = require('faunadb');

const q = faunadb.query;
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET,
});

exports.handler = async function (event, context) {
  try {
    // Get completed order IDs from FaunaDB
    const completedOrdersResponse = await client.query(
      q.Map(
        q.Paginate(q.Documents(q.Collection('completed_orders')), { size: 100000 }),
        q.Lambda('ref', q.Select(['data', 'orderId'], q.Get(q.Var('ref'))))
      )
    );
    const completedOrders = completedOrdersResponse.data;

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
        message: error.message,
      })
    };
  }
};