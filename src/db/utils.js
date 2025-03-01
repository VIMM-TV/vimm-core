const StreamKey = require('./models/streamKey');
const { Op } = require('sequelize');

// Utility functions for common database operations
const dbUtils = {
  // Mark a stream as live
  setStreamLive: async (streamId, isLive = true) => {
    try {
      const stream = await StreamKey.findOne({
        where: { streamID: streamId }
      });
      
      if (stream) {
        await stream.update({
          isLive,
          streamStarted: isLive ? new Date() : null,
          lastUsed: new Date()
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting stream live status:', error);
      return false;
    }
  },
  
  // Update viewer count
  updateViewerCount: async (streamId, change) => {
    try {
      const stream = await StreamKey.findOne({
        where: { streamID: streamId }
      });
      
      if (stream) {
        const newCount = Math.max(0, (stream.viewerCount || 0) + change);
        await stream.update({ viewerCount: newCount });
        return newCount;
      }
      return null;
    } catch (error) {
      console.error('Error updating viewer count:', error);
      return null;
    }
  },
  
  // Get all live streams
  getLiveStreams: async (options = {}) => {
    const { language, category, page = 1, limit = 20 } = options;
    
    let whereClause = {
      isLive: true,
      streamID: { [Op.ne]: null }
    };
    
    if (language) whereClause.streamLanguage = language;
    if (category) whereClause.streamCategory = category;
    
    try {
      const { count, rows } = await StreamKey.findAndCountAll({
        where: whereClause,
        limit,
        offset: (page - 1) * limit,
        order: [['viewerCount', 'DESC'], ['streamStarted', 'DESC']]
      });
      
      return {
        streams: rows,
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Error getting live streams:', error);
      return { streams: [], pagination: { total: 0, page, limit, pages: 0 } };
    }
  }
};

module.exports = dbUtils;