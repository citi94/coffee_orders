const faunadb = require('faunadb');

const q = faunadb.query;
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET,
});

exports.handler = async function (event, context) {
  try {
    // Simple collection scan instead of using an index
    const result = await client.query(
      q.Map(
        q.Paginate(q.Documents(q.Collection('completed_orders'))),
        q.Lambda("x", q.Select(["data", "orderId"], q.Get(q.Var("x"))))
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
}