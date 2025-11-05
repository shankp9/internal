const express = require('express');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Helper function to calculate utilization
const calculateUtilization = async (developerId, date = new Date()) => {
  const activeAssignments = await Assignment.find({
    developerId,
    status: 'approved',
    startDate: { $lte: date },
    endDate: { $gte: date },
  });

  const totalUtilization = activeAssignments.reduce((sum, ass) => sum + ass.utilization, 0);
  const availableCapacity = Math.max(0, 100 - totalUtilization);

  return {
    totalUtilization,
    availableCapacity,
    assignmentCount: activeAssignments.length,
    isOverUtilized: totalUtilization > 100,
  };
};

// @route   GET /api/developers
// @desc    Get all developers with utilization data
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = { role: 'employee', isActive: true };

    // Managers can only see their team members
    if (req.user.role === 'manager') {
      query.managerId = req.user._id;
    }

    // Employees can only see themselves
    if (req.user.role === 'employee') {
      query._id = req.user._id;
    }

    const developers = await User.find(query)
      .select('-password')
      .populate('managerId', 'name email')
      .sort({ name: 1 });

    // Calculate utilization for each developer
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const developersWithUtilization = await Promise.all(
      developers.map(async (developer) => {
        const utilization = await calculateUtilization(developer._id, date);

        // Get upcoming availability (assignments ending soon)
        const upcomingEnds = await Assignment.find({
          developerId: developer._id,
          status: 'approved',
          endDate: { $gte: date, $lte: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000) }, // Next 30 days
        }).sort({ endDate: 1 }).limit(5);

        // Get all assignments
        const allAssignments = await Assignment.find({
          developerId: developer._id,
          status: 'approved',
        })
          .populate('projectId', 'name clientId')
          .sort({ startDate: -1 });

        return {
          ...developer.toObject(),
          ...utilization,
          upcomingEnds,
          assignments: allAssignments,
        };
      })
    );

    res.json({
      success: true,
      count: developersWithUtilization.length,
      data: developersWithUtilization,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/developers/:id
// @desc    Get single developer with detailed utilization
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    let developer;

    // Employees can only see themselves
    if (req.user.role === 'employee' && req.params.id !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this developer',
      });
    }

    // Managers can only see their team members
    if (req.user.role === 'manager') {
      developer = await User.findOne({
        _id: req.params.id,
        managerId: req.user._id,
        role: 'employee',
      });
    } else {
      developer = await User.findOne({
        _id: req.params.id,
        role: 'employee',
      });
    }

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: 'Developer not found',
      });
    }

    await developer.populate('managerId', 'name email');

    // Calculate current utilization
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const utilization = await calculateUtilization(developer._id, date);

    // Get all assignments (approved, pending, rejected)
    const allAssignments = await Assignment.find({ developerId: developer._id })
      .populate('projectId', 'name clientId managerId')
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ startDate: -1 });

    // Get utilization history (weekly/monthly breakdown)
    const utilizationHistory = await calculateUtilizationHistory(developer._id);

    // Get upcoming assignments (future)
    const upcomingAssignments = await Assignment.find({
      developerId: developer._id,
      status: 'approved',
      startDate: { $gt: date },
    })
      .populate('projectId', 'name clientId')
      .sort({ startDate: 1 });

    // Calculate future capacity forecast (next 90 days, weekly)
    const futureCapacityForecast = [];
    for (let i = 7; i <= 90; i += 7) {
      const forecastDate = new Date(date);
      forecastDate.setDate(forecastDate.getDate() + i);

      const forecastAssignments = await Assignment.find({
        developerId: developer._id,
        status: 'approved',
        startDate: { $lte: forecastDate },
        endDate: { $gte: forecastDate },
      });

      const forecastUtilization = forecastAssignments.reduce((sum, ass) => sum + ass.utilization, 0);
      const forecastAvailable = Math.max(0, 100 - forecastUtilization);

      futureCapacityForecast.push({
        week: Math.floor(i / 7),
        date: forecastDate.toISOString().split('T')[0],
        utilization: Math.min(100, forecastUtilization),
        availableCapacity: forecastAvailable,
        isOverUtilized: forecastUtilization > 100,
      });
    }

    // Get assignments ending soon (next 30 days) - showing upcoming availability
    const assignmentsEndingSoon = await Assignment.find({
      developerId: developer._id,
      status: 'approved',
      endDate: { $gte: date, $lte: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000) },
    })
      .populate('projectId', 'name')
      .sort({ endDate: 1 });

    // Get upcoming availability windows (when assignments end)
    const availabilityWindows = [];
    assignmentsEndingSoon.forEach(assignment => {
      availabilityWindows.push({
        date: assignment.endDate,
        project: assignment.projectId?.name,
        utilization: assignment.utilization,
        availableFrom: assignment.endDate,
      });
    });

    // Calculate next available date (when capacity will be free)
    let nextAvailableDate = null;
    if (utilization.totalUtilization >= 80) {
      const nextEnding = assignmentsEndingSoon.find(ass => {
        const assignmentsOnEndDate = allAssignments.filter(a => 
          a.status === 'approved' &&
          a.startDate <= ass.endDate &&
          a.endDate >= ass.endDate
        );
        const utilOnEndDate = assignmentsOnEndDate.reduce((sum, a) => sum + a.utilization, 0);
        return utilOnEndDate < 80;
      });
      if (nextEnding) {
        nextAvailableDate = nextEnding.endDate;
      }
    }

    // Skills utilization (how much each skill is being used)
    const skillsUtilization = {};
    const developerSkills = developer.skills || [];
    developerSkills.forEach(skill => {
      skillsUtilization[skill] = 0;
    });

    allAssignments
      .filter(a => a.status === 'approved' && a.startDate <= date && a.endDate >= date)
      .forEach(assignment => {
        const projectTags = assignment.projectId?.tags || [];
        projectTags.forEach(tag => {
          if (skillsUtilization.hasOwnProperty(tag)) {
            skillsUtilization[tag] = (skillsUtilization[tag] || 0) + assignment.utilization;
          }
        });
      });

    res.json({
      success: true,
      data: {
        ...developer.toObject(),
        ...utilization,
        assignments: allAssignments,
        utilizationHistory,
        upcomingAssignments,
        futureCapacityForecast,
        assignmentsEndingSoon,
        availabilityWindows,
        nextAvailableDate,
        skillsUtilization,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Helper function to calculate utilization history
const calculateUtilizationHistory = async (developerId, weeks = 12) => {
  const history = [];
  const now = new Date();
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const assignments = await Assignment.find({
      developerId,
      status: 'approved',
      startDate: { $lte: weekEnd },
      endDate: { $gte: weekStart },
    });

    const totalUtilization = assignments.reduce((sum, ass) => {
      // Calculate overlap percentage for the week
      const overlapStart = new Date(Math.max(ass.startDate, weekStart));
      const overlapEnd = new Date(Math.min(ass.endDate, weekEnd));
      const overlapDays = Math.max(0, (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24) + 1);
      const weekDays = 7;
      return sum + (ass.utilization * (overlapDays / weekDays));
    }, 0);

    history.push({
      week: weekStart.toISOString().split('T')[0],
      utilization: Math.min(100, totalUtilization),
    });
  }

  return history;
};

// @route   GET /api/developers/:id/capacity
// @desc    Get developer capacity for date range
// @access  Private
router.get('/:id/capacity', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate and endDate',
      });
    }

    const developer = await User.findById(req.params.id);

    if (!developer || developer.role !== 'employee') {
      return res.status(404).json({
        success: false,
        message: 'Developer not found',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all overlapping assignments
    const assignments = await Assignment.find({
      developerId: developer._id,
      status: 'approved',
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    })
      .populate('projectId', 'name clientId')
      .sort({ startDate: 1 });

    // Calculate capacity for each day in range
    const capacity = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayAssignments = assignments.filter(ass => {
        return ass.startDate <= currentDate && ass.endDate >= currentDate;
      });

      const totalUtilization = dayAssignments.reduce((sum, ass) => sum + ass.utilization, 0);
      const availableCapacity = Math.max(0, 100 - totalUtilization);

      capacity.push({
        date: currentDate.toISOString().split('T')[0],
        utilization: Math.min(100, totalUtilization),
        availableCapacity,
        isOverUtilized: totalUtilization > 100,
        assignments: dayAssignments.map(ass => ({
          id: ass._id,
          project: ass.projectId,
          utilization: ass.utilization,
        })),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        developer: {
          id: developer._id,
          name: developer.name,
          email: developer.email,
        },
        capacity,
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
