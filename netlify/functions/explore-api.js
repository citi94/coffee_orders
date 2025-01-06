const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  try {
    console.log('Starting API exploration');
    
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
    
    // List of base URLs to try
    const baseUrls = [
      'https://purchase.izettle.com',
      'https://products.izettle.com',
      'https://image.izettle.com',
      'https://finance.izettle.com'
    ];
    
    // List of potential API versions
    const versions = ['v1', 'v2', 'v3'];
    
    // List of potential endpoints
    const endpoints = [
      'purchases',
      'orders',
      'tables',
      'products',
      'inventory',
      'transactions',
      'finance'
    ];

    const results = {
      discovered: [],
      errors: []
    };

    // Try OPTIONS request on each combination
    for (const baseUrl of baseUrls) {
      for (const version of versions) {
        for (const endpoint of endpoints) {
          const url = `${baseUrl}/${endpoint}`;
          const versionedUrl = `${baseUrl}/${version}/${endpoint}`;
          
          try {
            // Try base endpoint
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${access_token}`
              }
            });
            
            console.log(`Testing ${url}:`, {
              status: response.status,
              statusText: response.statusText
            });

            if (response.status !== 404) {
              results.discovered.push({
                url,
                status: response.status,
                statusText: response.statusText
              });
            }

            // Try versioned endpoint
            const versionedResponse = await fetch(versionedUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${access_token}`
              }
            });
            
            console.log(`Testing ${versionedUrl}:`, {
              status: versionedResponse.status,
              statusText: versionedResponse.statusText
            });

            if (versionedResponse.status !== 404) {
              results.discovered.push({
                url: versionedUrl,
                status: versionedResponse.status,
                statusText: versionedResponse.statusText
              });
            }

          } catch (error) {
            results.errors.push({
              url,
              error: error.message
            });
          }
        }
      }
    }

    // Also try to discover any API documentation endpoints
    const docEndpoints = [
      'https://purchase.izettle.com/swagger',
      'https://purchase.izettle.com/docs',
      'https://purchase.izettle.com/api-docs',
      'https://developer.izettle.com/api'
    ];

    for (const docUrl of docEndpoints) {
      try {
        const response = await fetch(docUrl, {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        });
        
        console.log(`Testing doc endpoint ${docUrl}:`, {
          status: response.status,
          statusText: response.statusText
        });

        if (response.status !== 404) {
          results.discovered.push({
            url: docUrl,
            status: response.status,
            statusText: response.statusText
          });
        }
      } catch (error) {
        results.errors.push({
          url: docUrl,
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