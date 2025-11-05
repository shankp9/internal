const express = require('express');
const User = require('../models/User');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Assignment = require('../models/Assignment');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dashboard/manager
// @desc    Get manager dashboard data
// @access  Private/Manager
router.get('/manager', protect, async (req, res) => {
  try {
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access manager dashboard',
      });
    }

    const managerId = req.user.role === 'admin' && req.query.managerId 
      ? req.query.managerId 
      : req.user._id;

    // Get team members
    const teamMembers = await User.find({ managerId, role: 'employee', isActive: true })
      .select('name email skills')
      .sort({ name: 1 });

    const now = new Date();

    // Calculate team utilization
    const teamUtilization = await Promise.all(
      teamMembers.map(async (member) => {
        const assignments = await Assignment.find({
          developerId: member._id,
          status: 'approved',
          startDate: { $lte: now },
          endDate: { $gte: now },
        });

        const totalUtilization = assignments.reduce((sum, ass) => sum + ass.utilization, 0);
        const availableCapacity = Math.max(0, 100 - totalUtilization);

        return {
          id: member._id,
          name: member.name,
          email: member.email,
          utilization: Math.min(100, totalUtilization),
          availableCapacity,
          assignmentCount: assignments.length,
          isOverUtilized: totalUtilization > 100,
        };
      })
    );

    // Get pending approvals
    const managerProjects = await Project.find({ managerId }).distinct('_id');
    const pendingApprovals = await Assignment.find({
      projectId: { $in: managerProjects },
      status: 'pending',
    })
      .populate('projectId', 'name clientId')
      .populate('developerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get upcoming availability (assignments ending in next 30 days)
    const upcomingEnds = await Assignment.find({
      developerId: { $in: teamMembers.map(m => m._id) },
      status: 'approved',
      endDate: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
    })
      .populate('developerId', 'name email')
      .populate('projectId', 'name')
      .sort({ endDate: 1 })
      .limit(10);

    // Get projects breakdown
    const projects = await Project.find({ managerId })
      .populate('clientId', 'name')
      .sort({ startDate: -1 });

    const projectsBreakdown = await Promise.all(
      projects.map(async (project) => {
        const assignments = await Assignment.find({
          projectId: project._id,
          status: 'approved',
          startDate: { $lte: now },
          endDate: { $gte: now },
        });

        const totalUtilization = assignments.reduce((sum, ass) => sum + ass.utilization, 0);

        return {
          id: project._id,
          name: project.name,
          client: project.clientId?.name,
          utilization: totalUtilization,
          developerCount: new Set(assignments.map(a => a.developerId.toString())).size,
        };
      })
    );

    // Calculate total team utilization
    const totalTeamUtilization = teamUtilization.reduce((sum, member) => sum + member.utilization, 0);
    const averageUtilization = teamMembers.length > 0 ? totalTeamUtilization / teamMembers.length : 0;

    // Calculate team capacity summary
    const totalAvailableCapacity = teamUtilization.reduce((sum, member) => sum + member.availableCapacity, 0);
    const averageAvailableCapacity = teamMembers.length > 0 ? totalAvailableCapacity / teamMembers.length : 0;

    // Skills gap analysis
    const skillsGap = new Map();
    teamMembers.forEach(member => {
      const memberSkills = member.skills || [];
      const memberUtilization = teamUtilization.find(t => t.id.toString() === member._id.toString());
      
      memberSkills.forEach(skill => {
        if (!skillsGap.has(skill)) {
          skillsGap.set(skill, {
            skill,
            developers: [],
            totalCapacity: 0,
            totalUtilized: 0,
          });
        }
        const skillData = skillsGap.get(skill);
        skillData.developers.push({
          id: member._id,
          name: member.name,
          utilization: memberUtilization?.utilization || 0,
        });
        skillData.totalCapacity += 100;
        if (memberUtilization) {
          skillData.totalUtilized += memberUtilization.utilization;
        }
      });
    });

    const skillsMatrix = Array.from(skillsGap.values()).map(data => ({
      skill: data.skill,
      developerCount: data.developers.length,
      totalCapacity: data.totalCapacity,
      totalUtilized: data.totalUtilized,
      averageUtilization: data.developers.length > 0 ? (data.totalUtilized / data.developers.length) : 0,
      availableCapacity: data.totalCapacity - data.totalUtilized,
      developers: data.developers,
    })).sort((a, b) => b.developerCount - a.developerCount);

    // Capacity forecast for next 30, 60, 90 days
    const capacityForecast = [];
    const forecastDays = [30, 60, 90];
    
    for (const days of forecastDays) {
      const forecastDate = new Date(now);
      forecastDate.setDate(forecastDate.getDate() + days);

      const forecastUtilizations = await Promise.all(
        teamMembers.map(async (member) => {
          const assignments = await Assignment.find({
            developerId: member._id,
            status: 'approved',
            startDate: { $lte: forecastDate },
            endDate: { $gte: forecastDate },
          });
          return assignments.reduce((sum, ass) => sum + ass.utilization, 0);
        })
      );

      const forecastAvgUtilization = forecastUtilizations.length > 0
        ? forecastUtilizations.reduce((sum, util) => sum + util, 0) / forecastUtilizations.length
        : 0;

      const forecastAvailable = forecastUtilizations.reduce((sum, util) => sum + Math.max(0, 100 - util), 0);

      capacityForecast.push({
        days,
        date: forecastDate.toISOString().split('T')[0],
        averageUtilization: Math.round(forecastAvgUtilization * 100) / 100,
        totalAvailable: Math.round(forecastAvailable * 100) / 100,
        availableDevelopers: forecastUtilizations.filter(util => util < 80).length,
      });
    }

    // Capacity distribution
    const capacityDistribution = {
      low: teamUtilization.filter(t => t.utilization < 50).length,
      medium: teamUtilization.filter(t => t.utilization >= 50 && t.utilization < 80).length,
      high: teamUtilization.filter(t => t.utilization >= 80 && t.utilization <= 100).length,
      over: teamUtilization.filter(t => t.isOverUtilized).length,
    };

    res.json({
      success: true,
      data: {
        teamUtilization,
        averageUtilization: Math.round(averageUtilization * 100) / 100,
        averageAvailableCapacity: Math.round(averageAvailableCapacity * 100) / 100,
        totalTeamMembers: teamMembers.length,
        pendingApprovals,
        upcomingAvailability: upcomingEnds,
        projectsBreakdown,
        skillsMatrix,
        capacityForecast,
        capacityDistribution,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/dashboard/client
// @desc    Get client dashboard data
// @access  Private
router.get('/client', protect, async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide clientId',
      });
    }

    const client = await Client.findById(clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // Get all projects for this client
    const projects = await Project.find({ clientId })
      .populate('managerId', 'name email')
      .sort({ startDate: -1 });

    const now = new Date();

    // Get projects with utilization
    const projectsWithUtilization = await Promise.all(
      projects.map(async (project) => {
        const assignments = await Assignment.find({
          projectId: project._id,
          status: 'approved',
          startDate: { $lte: now },
          endDate: { $gte: now },
        })
          .populate('developerId', 'name email skills');

        const totalUtilization = assignments.reduce((sum, ass) => sum + ass.utilization, 0);
        const developers = assignments.map(a => a.developerId);

        return {
          ...project.toObject(),
          totalUtilization,
          developerCount: new Set(developers.map(d => d._id.toString())).size,
          developers: Array.from(new Set(developers.map(d => d._id.toString()))).map(id => 
            developers.find(d => d._id.toString() === id)
          ),
        };
      })
    );

    // Calculate aggregate utilization
    const aggregateUtilization = projectsWithUtilization.reduce(
      (sum, project) => sum + project.totalUtilization,
      0
    );

    res.json({
      success: true,
      data: {
        client: {
          id: client._id,
          name: client.name,
          industry: client.industry,
        },
        projects: projectsWithUtilization,
        aggregateUtilization,
        totalProjects: projects.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/dashboard/project
// @desc    Get project dashboard data
// @access  Private
router.get('/project', protect, async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide projectId',
      });
    }

    const project = await Project.findById(projectId)
      .populate('clientId', 'name industry')
      .populate('managerId', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Get all assignments for this project
    const assignments = await Assignment.find({ projectId })
      .populate('developerId', 'name email skills')
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ startDate: 1 });

    const now = new Date();

    // Separate active and upcoming assignments
    const activeAssignments = assignments.filter(ass => 
      ass.status === 'approved' &&
      ass.startDate <= now &&
      ass.endDate >= now
    );

    const upcomingAssignments = assignments.filter(ass =>
      ass.status === 'approved' &&
      ass.startDate > now
    );

    const totalUtilization = activeAssignments.reduce((sum, ass) => sum + ass.utilization, 0);

    // Create Gantt-style data
    const ganttData = assignments
      .filter(ass => ass.status === 'approved')
      .map(ass => ({
        id: ass._id,
        developer: ass.developerId?.name,
        utilization: ass.utilization,
        startDate: ass.startDate,
        endDate: ass.endDate,
        tags: ass.tags,
      }));

    res.json({
      success: true,
      data: {
        project,
        assignments,
        activeAssignments,
        upcomingAssignments,
        totalUtilization,
        developerCount: new Set(activeAssignments.map(a => a.developerId?._id.toString())).size,
        ganttData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/dashboard/admin
// @desc    Get admin/company overview dashboard
// @access  Private/Admin
router.get('/admin', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin dashboard',
      });
    }

    const now = new Date();

    // Get all developers
    const developers = await User.find({ role: 'employee', isActive: true })
      .select('name email managerId')
      .populate('managerId', 'name');

    // Calculate utilization for all developers
    const developerUtilizations = await Promise.all(
      developers.map(async (dev) => {
        const assignments = await Assignment.find({
          developerId: dev._id,
          status: 'approved',
          startDate: { $lte: now },
          endDate: { $gte: now },
        });

        const totalUtilization = assignments.reduce((sum, ass) => sum + ass.utilization, 0);
        const availableCapacity = Math.max(0, 100 - totalUtilization);

        return {
          id: dev._id,
          name: dev.name,
          email: dev.email,
          manager: dev.managerId?.name,
          utilization: Math.min(100, totalUtilization),
          availableCapacity,
          isOverUtilized: totalUtilization > 100,
        };
      })
    );

    // Create utilization heatmap data
    const utilizationHeatmap = developerUtilizations.map(dev => ({
      developer: dev.name,
      utilization: dev.utilization,
      status: dev.isOverUtilized ? 'over' : dev.utilization > 80 ? 'high' : dev.utilization > 50 ? 'medium' : 'low',
    }));

    // Get overbooked developers
    const overbookedDevelopers = developerUtilizations.filter(dev => dev.isOverUtilized);

    // Calculate available capacity summary
    const totalCapacity = developers.length * 100;
    const totalUtilized = developerUtilizations.reduce((sum, dev) => sum + dev.utilization, 0);
    const totalAvailable = developerUtilizations.reduce((sum, dev) => sum + dev.availableCapacity, 0);
    const averageUtilization = developers.length > 0 
      ? totalUtilized / developers.length 
      : 0;

    // Get upcoming capacity (assignments ending in next 30 days)
    const upcomingCapacity = await Assignment.find({
      status: 'approved',
      endDate: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
    })
      .populate('developerId', 'name email')
      .populate('projectId', 'name clientId')
      .sort({ endDate: 1 });

    // Get all clients with utilization
    const clients = await Client.find({ isActive: true });
    const clientsUtilization = await Promise.all(
      clients.map(async (client) => {
        const projects = await Project.find({ clientId: client._id });
        const projectIds = projects.map(p => p._id);
        
        const assignments = await Assignment.find({
          projectId: { $in: projectIds },
          status: 'approved',
          startDate: { $lte: now },
          endDate: { $gte: now },
        });

        const totalUtilization = assignments.reduce((sum, ass) => sum + ass.utilization, 0);

        return {
          id: client._id,
          name: client.name,
          utilization: totalUtilization,
          projectCount: projects.length,
        };
      })
    );

    // Get pending approvals count
    const pendingApprovalsCount = await Assignment.countDocuments({ status: 'pending' });

    // Capacity forecast for next 3 months
    const capacityForecast = [];
    for (let i = 0; i < 3; i++) {
      const forecastDate = new Date(now);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      forecastDate.setDate(1); // Start of month
      
      const monthEnd = new Date(forecastDate);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0); // Last day of month

      const monthAssignments = await Assignment.find({
        status: 'approved',
        startDate: { $lte: monthEnd },
        endDate: { $gte: forecastDate },
      });

      // Calculate utilization for mid-month
      const midMonth = new Date(forecastDate);
      midMonth.setDate(15);

      const midMonthUtilizations = await Promise.all(
        developers.map(async (dev) => {
          const assignments = await Assignment.find({
            developerId: dev._id,
            status: 'approved',
            startDate: { $lte: midMonth },
            endDate: { $gte: midMonth },
          });
          return assignments.reduce((sum, ass) => sum + ass.utilization, 0);
        })
      );

      const monthAvgUtilization = midMonthUtilizations.length > 0
        ? midMonthUtilizations.reduce((sum, util) => sum + util, 0) / midMonthUtilizations.length
        : 0;
      
      const monthTotalAvailable = midMonthUtilizations.reduce((sum, util) => sum + Math.max(0, 100 - util), 0);

      capacityForecast.push({
        month: forecastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        averageUtilization: Math.round(monthAvgUtilization * 100) / 100,
        totalAvailable: Math.round(monthTotalAvailable * 100) / 100,
      });
    }

    // Skills matrix with capacity
    const skillsMatrix = [];
    const skillMap = new Map();

    developers.forEach(dev => {
      const devSkills = dev.skills || [];
      const devUtilization = developerUtilizations.find(u => u.id.toString() === dev._id.toString());
      
      devSkills.forEach(skill => {
        if (!skillMap.has(skill)) {
          skillMap.set(skill, {
            skill,
            developers: [],
            totalCapacity: 0,
            totalUtilized: 0,
          });
        }
        const skillData = skillMap.get(skill);
        skillData.developers.push(dev._id);
        skillData.totalCapacity += 100;
        if (devUtilization) {
          skillData.totalUtilized += devUtilization.utilization;
        }
      });
    });

    skillMap.forEach((data, skill) => {
      const uniqueDevelopers = new Set(data.developers);
      skillsMatrix.push({
        skill,
        developerCount: uniqueDevelopers.size,
        totalCapacity: data.totalCapacity,
        totalUtilized: data.totalUtilized,
        averageUtilization: data.totalCapacity > 0 ? (data.totalUtilized / uniqueDevelopers.size) : 0,
        availableCapacity: data.totalCapacity - data.totalUtilized,
      });
    });

    skillsMatrix.sort((a, b) => b.developerCount - a.developerCount);

    // Upcoming availability timeline (next 90 days)
    const upcomingAvailabilityTimeline = [];
    for (let i = 0; i < 90; i += 7) { // Weekly data points
      const date = new Date(now);
      date.setDate(date.getDate() + i);

      const dateUtilizations = await Promise.all(
        developers.map(async (dev) => {
          const assignments = await Assignment.find({
            developerId: dev._id,
            status: 'approved',
            startDate: { $lte: date },
            endDate: { $gte: date },
          });
          const util = assignments.reduce((sum, ass) => sum + ass.utilization, 0);
          return util;
        })
      );

      const available = dateUtilizations.filter(util => util < 80).length;
      const highUtilization = dateUtilizations.filter(util => util >= 80 && util <= 100).length;
      const overUtilized = dateUtilizations.filter(util => util > 100).length;

      upcomingAvailabilityTimeline.push({
        date: date.toISOString().split('T')[0],
        available,
        highUtilization,
        overUtilized,
      });
    }

    // Projects with capacity needs
    const allProjects = await Project.find({ status: 'active' })
      .populate('clientId', 'name')
      .populate('managerId', 'name');

    const projectsWithCapacity = await Promise.all(
      allProjects.map(async (project) => {
        const assignments = await Assignment.find({
          projectId: project._id,
          status: 'approved',
          startDate: { $lte: now },
          endDate: { $gte: now },
        });

        const currentUtilization = assignments.reduce((sum, ass) => sum + ass.utilization, 0);
        const developerCount = new Set(assignments.map(a => a.developerId.toString())).size;

        // Find next assignment starting date
        const nextAssignment = await Assignment.findOne({
          projectId: project._id,
          status: 'approved',
          startDate: { $gt: now },
        }).sort({ startDate: 1 });

        return {
          id: project._id,
          name: project.name,
          client: project.clientId?.name,
          currentUtilization: Math.round(currentUtilization * 100) / 100,
          developerCount,
          nextAssignmentDate: nextAssignment?.startDate,
        };
      })
    );

    // Capacity distribution
    const capacityDistribution = {
      low: developerUtilizations.filter(d => d.utilization < 50).length,
      medium: developerUtilizations.filter(d => d.utilization >= 50 && d.utilization < 80).length,
      high: developerUtilizations.filter(d => d.utilization >= 80 && d.utilization <= 100).length,
      over: developerUtilizations.filter(d => d.utilization > 100).length,
    };

    res.json({
      success: true,
      data: {
        totalDevelopers: developers.length,
        utilizationHeatmap,
        overbookedDevelopers,
        capacitySummary: {
          totalCapacity,
          totalUtilized: Math.round(totalUtilized * 100) / 100,
          totalAvailable: Math.round(totalAvailable * 100) / 100,
          averageUtilization: Math.round(averageUtilization * 100) / 100,
          utilizationPercentage: Math.round((totalUtilized / totalCapacity) * 100 * 100) / 100,
        },
        upcomingCapacity,
        clientsUtilization,
        pendingApprovalsCount,
        capacityForecast,
        skillsMatrix,
        upcomingAvailabilityTimeline,
        projectsWithCapacity,
        capacityDistribution,
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
