const express = require('express');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Assignment = require('../models/Assignment');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/clients
// @desc    Get all clients
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    // Managers can see clients where they manage projects
    if (req.user.role === 'manager') {
      const managerProjects = await Project.find({ managerId: req.user._id }).distinct('clientId');
      query._id = { $in: managerProjects };
    }

    const clients = await Client.find(query)
      .populate('accountManagerId', 'name email')
      .sort({ name: 1 });

    // Calculate total utilization for each client
    const clientsWithUtilization = await Promise.all(
      clients.map(async (client) => {
        const projects = await Project.find({ clientId: client._id });
        const projectIds = projects.map(p => p._id);
        
        const now = new Date();
        const activeAssignments = await Assignment.find({
          projectId: { $in: projectIds },
          status: 'approved',
          startDate: { $lte: now },
          endDate: { $gte: now },
        });

        const totalUtilization = activeAssignments.reduce((sum, ass) => sum + ass.utilization, 0);

        return {
          ...client.toObject(),
          totalUtilization,
          projectCount: projects.length,
        };
      })
    );

    res.json({
      success: true,
      count: clientsWithUtilization.length,
      data: clientsWithUtilization,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/clients/:id
// @desc    Get single client with projects
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('accountManagerId', 'name email');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // Get all projects for this client
    const projects = await Project.find({ clientId: client._id })
      .populate('managerId', 'name email')
      .sort({ startDate: -1 });

    // Calculate total utilization and get assignments for each project
    const projectIds = projects.map(p => p._id);
    const now = new Date();
    
    // Get all assignments for all projects (not just active ones)
    const allAssignments = await Assignment.find({
      projectId: { $in: projectIds },
    })
      .populate('projectId', 'name clientId')
      .populate('developerId', 'name email skills')
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ startDate: -1 });

    // Get active assignments for utilization calculation
    const activeAssignments = allAssignments.filter(ass => {
      return ass.status === 'approved' &&
        ass.startDate <= now &&
        ass.endDate >= now;
    });

    const totalUtilization = activeAssignments.reduce((sum, ass) => sum + ass.utilization, 0);

    // Group assignments by project
    const projectsWithAssignments = projects.map(project => {
      const projectAssignments = allAssignments.filter(
        ass => ass.projectId.toString() === project._id.toString()
      );
      
      const projectActiveAssignments = projectAssignments.filter(ass => {
        return ass.status === 'approved' &&
          ass.startDate <= now &&
          ass.endDate >= now;
      });
      
      const projectTotalUtilization = projectActiveAssignments.reduce(
        (sum, ass) => sum + ass.utilization, 0
      );

      return {
        ...project.toObject(),
        assignments: projectAssignments,
        totalUtilization: projectTotalUtilization,
        activeAssignmentCount: projectActiveAssignments.length,
      };
    });

    res.json({
      success: true,
      data: {
        ...client.toObject(),
        projects: projectsWithAssignments,
        assignments: allAssignments,
        totalUtilization,
        projectCount: projects.length,
        activeAssignmentCount: activeAssignments.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/clients
// @desc    Create new client
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, industry, accountManagerId, startDate } = req.body;

    const client = await Client.create({
      name,
      industry,
      accountManagerId,
      startDate: startDate || new Date(),
    });

    await client.populate('accountManagerId', 'name email');

    res.status(201).json({
      success: true,
      data: client,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/clients/:id
// @desc    Update client
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, industry, accountManagerId, startDate, isActive } = req.body;

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      {
        name,
        industry,
        accountManagerId,
        startDate,
        isActive,
      },
      { new: true, runValidators: true }
    ).populate('accountManagerId', 'name email');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   DELETE /api/clients/:id
// @desc    Delete client (soft delete)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    res.json({
      success: true,
      message: 'Client deactivated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
