const express = require('express');
const AIConsumption = require('../models/AIConsumption');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/ai-consumption
// @desc    Get AI consumption statistics
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { projectId, meetingId, startDate, endDate } = req.query;
    const query = {};

    if (projectId) {
      query.projectId = projectId;
    }

    if (meetingId) {
      query.meetingId = meetingId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const consumption = await AIConsumption.find(query)
      .populate('projectId', 'name')
      .populate('meetingId', 'title meetingDate')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Calculate totals
    const totals = consumption.reduce((acc, item) => {
      acc.totalTokens += item.totalTokens;
      acc.totalCost += item.totalCost;
      return acc;
    }, { totalTokens: 0, totalCost: 0 });

    res.json({
      success: true,
      count: consumption.length,
      data: consumption,
      totals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/ai-consumption/stats
// @desc    Get aggregated AI consumption statistics
// @access  Private/Admin
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const matchQuery = {};

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) {
        matchQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchQuery.createdAt.$lte = new Date(endDate);
      }
    }

    // Aggregate statistics
    const stats = await AIConsumption.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalTokens: { $sum: '$totalTokens' },
          totalCost: { $sum: '$totalCost' },
          avgTokensPerCall: { $avg: '$totalTokens' },
          avgCostPerCall: { $avg: '$totalCost' },
          byModel: {
            $push: {
              model: '$model',
              tokens: '$totalTokens',
              cost: '$totalCost',
            },
          },
          byFunction: {
            $push: {
              function: '$functionName',
              tokens: '$totalTokens',
              cost: '$totalCost',
            },
          },
        },
      },
    ]);

    // Calculate model breakdown
    const modelBreakdown = {};
    const functionBreakdown = {};

    if (stats.length > 0) {
      stats[0].byModel.forEach(item => {
        if (!modelBreakdown[item.model]) {
          modelBreakdown[item.model] = { calls: 0, tokens: 0, cost: 0 };
        }
        modelBreakdown[item.model].calls++;
        modelBreakdown[item.model].tokens += item.tokens;
        modelBreakdown[item.model].cost += item.cost;
      });

      stats[0].byFunction.forEach(item => {
        if (!functionBreakdown[item.function]) {
          functionBreakdown[item.function] = { calls: 0, tokens: 0, cost: 0 };
        }
        functionBreakdown[item.function].calls++;
        functionBreakdown[item.function].tokens += item.tokens;
        functionBreakdown[item.function].cost += item.cost;
      });
    }

    res.json({
      success: true,
      data: {
        ...(stats[0] || {}),
        modelBreakdown,
        functionBreakdown,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

