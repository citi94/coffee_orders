const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  try {
    console.log('Starting focused API exploration');
    
    // Get access token
    const tokenResponse = await fetch('https://oauth.zettle.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'client_id': process.env.ZETTLE_CLIENT_ID,
        'assertion': process.env.ZETTLE_CLIENT_SECRET
      }).toString()
    });

    const { access_token } = await tokenResponse.json();
    
    // Just try the most likely endpoints for orders/tables
    const endpointsToTry = [
      'https://purchase.izettle.com/v2/purchases',
      'https://purchase.izettle.com/purchases/v2',  // This is the one we know works
      'https://purchase.izettle.com/v3/orders',
      'https://purchase.izettle.com/orders/v3',
      'https://purchase.izettle.com/v1/tables',
      'https://purchase.izettle.com/tables/v1',
      // Try some alternative base URLs
      'https://order.izettle.com/v3/orders',
      'https://tables.izettle.com/v1/tables'
    ];

    const results = [];
    
    // Try each endpoint
    for (const url of endpointsToTry) {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const fullUrl = url.includes('purchases') ? 
          `${url}?startDate=${startOfDay.toISOString()}` : url;
        
        const response = await fetch(fullUrl, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json'
          }
        });
        
        let responseBody;
        try {
          responseBody = await response.text();
          // Try to parse as JSON if possible
          try {
            responseBody = JSON.parse(responseBody);
          } catch (e) {
            // Leave as text if not JSON
          }
        } catch (e) {
          responseBody = 'Could not read response body';
        }
        
        console.log(`Testing ${url}:`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers),
          body: responseBody
        });

        results.push({
          url,
          status: response.status,
          statusText: response.statusText,
          body: responseBody
        });
      } catch (error) {
        console.log(`Error testing ${url}:`, error.message);
        results.push({
          url,
          error: error.message
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        results,
        timestamp: new Date().toISOString()
      }, null, 2)
    };

  } catch (error) {
    console.error('Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};