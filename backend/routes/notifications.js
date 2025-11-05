const express = require('express');
const Assignment = require('../models/Assignment');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get notifications for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get stored notifications from database
    const storedNotifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Convert to expected format
    const notifications = storedNotifications.map(notif => ({
      id: notif._id.toString(),
      type: notif.type,
      message: notif.message,
      priority: notif.priority,
      read: notif.read,
      createdAt: notif.createdAt,
      relatedId: notif.relatedId?.toString(),
      relatedModel: notif.relatedModel,
    }));

    // Also add computed notifications (for backward compatibility)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (req.user.role === 'admin') {
      // Pending approvals
      const pendingApprovals = await Assignment.countDocuments({ status: 'pending' });
      if (pendingApprovals > 0) {
        notifications.unshift({
          type: 'pending_approval',
          message: `You have ${pendingApprovals} assignment(s) pending approval`,
          priority: 'high',
          read: false,
        });
      }

      // Over-utilized developers
      const developers = await User.find({ role: 'employee', isActive: true });
      const overUtilizedCount = await Promise.all(
        developers.map(async (dev) => {
          const assignments = await Assignment.find({
            developerId: dev._id,
            status: 'approved',
            startDate: { $lte: now },
            endDate: { $gte: now },
          });
          const totalUtilization = assignments.reduce((sum, ass) => sum + ass.utilization, 0);
          return totalUtilization > 100;
        })
      );

      const overUtilized = overUtilizedCount.filter(v => v).length;
      if (overUtilized > 0) {
        notifications.unshift({
          type: 'over_utilization',
          message: `${overUtilized} developer(s) are over-utilized (>100%)`,
          priority: 'high',
          read: false,
        });
      }
    }

    if (req.user.role === 'manager') {
      // Pending approvals for manager's projects
      const managerProjects = await Project.find({ managerId: req.user._id }).distinct('_id');
      const pendingApprovals = await Assignment.countDocuments({
        projectId: { $in: managerProjects },
        status: 'pending',
      });

      if (pendingApprovals > 0) {
        notifications.unshift({
          type: 'pending_approval',
          message: `You have ${pendingApprovals} assignment(s) pending approval`,
          priority: 'medium',
          read: false,
        });
      }

      // Team members with approaching end dates
      const teamMembers = await User.find({ managerId: req.user._id, role: 'employee' });
      const teamMemberIds = teamMembers.map(m => m._id);

      const approachingEnds = await Assignment.find({
        developerId: { $in: teamMemberIds },
        status: 'approved',
        endDate: { $gte: now, $lte: thirtyDaysFromNow },
      }).countDocuments();

      if (approachingEnds > 0) {
        notifications.unshift({
          type: 'approaching_end_date',
          message: `${approachingEnds} assignment(s) ending in the next 30 days`,
          priority: 'low',
          read: false,
        });
      }
    }

    if (req.user.role === 'employee') {
      // My pending assignments
      const myPending = await Assignment.countDocuments({
        developerId: req.user._id,
        status: 'pending',
      });

      if (myPending > 0) {
        notifications.unshift({
          type: 'pending_assignment',
          message: `You have ${myPending} assignment(s) pending approval`,
          priority: 'medium',
          read: false,
        });
      }

      // My over-utilization
      const myAssignments = await Assignment.find({
        developerId: req.user._id,
        status: 'approved',
        startDate: { $lte: now },
        endDate: { $gte: now },
      });

      const myUtilization = myAssignments.reduce((sum, ass) => sum + ass.utilization, 0);
      if (myUtilization > 100) {
        notifications.unshift({
          type: 'over_utilization',
          message: `You are over-utilized (${Math.round(myUtilization)}%)`,
          priority: 'high',
          read: false,
        });
      }

      // Approaching end dates
      const approachingEnds = await Assignment.find({
        developerId: req.user._id,
        status: 'approved',
        endDate: { $gte: now, $lte: thirtyDaysFromNow },
      }).countDocuments();

      if (approachingEnds > 0) {
        notifications.unshift({
          type: 'approaching_end_date',
          message: `${approachingEnds} of your assignment(s) ending in the next 30 days`,
          priority: 'low',
          read: false,
        });
      }
    }

    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
