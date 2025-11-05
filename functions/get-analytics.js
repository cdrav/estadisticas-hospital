const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { JWT } = require('google-auth-library');

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.hdsa.gov.co',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// Initialize the GA4 client
const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
});

// Your GA4 property ID
const propertyId = '233534697';

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // Get the current date and calculate the date 1 year ago
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Format dates as YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    // Fetch data from Google Analytics 4
    const [totalVisitsResponse, monthlyVisitsResponse, topPagesResponse, devicesResponse, browsersResponse] = await Promise.all([
      // Total visits
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{
          startDate: '2020-01-01', // Or your preferred start date
          endDate: 'today',
        }],
        metrics: [{ name: 'totalUsers' }],
      }),
      
      // Monthly visits
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{
          startDate: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)),
          endDate: 'today',
        }],
        metrics: [{ name: 'totalUsers' }],
      }),
      
      // Top pages
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{
          startDate: formatDate(oneYearAgo),
          endDate: 'today',
        }],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }],
        limit: 10,
        orderBys: [{
          desc: true,
          metric: { metricName: 'screenPageViews' }
        }]
      }),
      
      // Devices
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{
          startDate: formatDate(oneYearAgo),
          endDate: 'today',
        }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }]
      }),
      
      // Browsers
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{
          startDate: formatDate(oneYearAgo),
          endDate: 'today',
        }],
        dimensions: [{ name: 'browser' }],
        metrics: [{ name: 'sessions' }],
        limit: 5,
        orderBys: [{
          desc: true,
          metric: { metricName: 'sessions' }
        }]
      })
    ]);
    
    // Process the responses
    const totalVisits = parseInt(totalVisitsResponse[0].rows?.[0]?.metricValues?.[0]?.value || '0');
    const monthlyVisits = parseInt(monthlyVisitsResponse[0].rows?.[0]?.metricValues?.[0]?.value || '0');
    
    const topPages = topPagesResponse[0].rows?.map(row => ({
      path: row.dimensionValues[0].value,
      title: row.dimensionValues[1].value,
      views: row.metricValues[0].value
    })) || [];
    
    const devices = {};
    devicesResponse[0].rows?.forEach(row => {
      devices[row.dimensionValues[0].value] = parseInt(row.metricValues[0].value);
    });
    
    const browsers = {};
    browsersResponse[0].rows?.forEach(row => {
      browsers[row.dimensionValues[0].value] = parseInt(row.metricValues[0].value);
    });
    
    // Prepare the response data
    const data = {
      totalVisits,
      monthlyVisits,
      topPages,
      devices,
      browsers,
      lastUpdate: now.toISOString()
    };

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Failed to fetch analytics data' }),
    };
  }
};
