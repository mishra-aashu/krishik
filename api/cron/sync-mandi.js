const { syncMandiPrices } = require('../../scripts/sync-mandi-prices');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('[API Cron] Triggering Mandi Prices Sync...');
    const result = await syncMandiPrices();
    return res.status(200).json({
      success: true,
      message: 'Daily mandi prices synced successfully',
      syncedCount: result.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API Cron] Error syncing mandi prices:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync mandi prices'
    });
  }
};
