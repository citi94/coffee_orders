const { fetch } = require('node-fetch');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

exports.handler = async function(event, context) {
  try {
    // Decode the base64 encoded private key
    const privateKey = `-----BEGIN RSA PRIVATE KEY-----\n${Buffer.from(process.env.ZETTLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8')}\n-----END RSA PRIVATE KEY-----`;

    // Generate JWT assertion
    const assertion = jwt.sign(
      {
        iss: process.env.ZETTLE_CLIENT_ID,
        sub: process.env.ZETTLE_CLIENT_ID,
        aud: 'https://oauth.zettle.com/token',
        exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        jti: uuidv4()
      },
      privateKey,
      { algorithm: 'RS256' }
    );

    // Step 1: Get access token
    const tokenResponse = await fetch('https://oauth.zettle.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        client_id: process.env.ZETTLE_CLIENT_ID,
        assertion: assertion
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(`Token request failed with status ${tokenResponse.status}: ${errorData.error_description || errorData.error || 'Unknown error'}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Step 2: Fetch orders using the access token
    const ordersResponse = await fetch('https://purchase.izettle.com/purchases/v2', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!ordersResponse.ok) {
      const errorData = await ordersResponse.json();
      throw new Error(`Orders request failed with status ${ordersResponse.status}: ${errorData.error_description || errorData.error || 'Unknown error'}`);
    }

    const orders = await ordersResponse.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ orders: orders.purchases || [] })
    };
  } catch (error) {
    console.error('Error in function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};