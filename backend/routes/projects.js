const express = require('express');
const Project = require('../models/Project');
const Client = require('../models/Client');
const Assignment = require('../models/Assignment');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/projects
// @desc    Get all projects
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    // Managers can see their projects
    if (req.user.role === 'manager') {
      query.managerId = req.user._id;
    }

    // Employees can see projects they're assigned to
    if (req.user.role === 'employee') {
      const assignments = await Assignment.find({ developerId: req.user._id }).distinct('projectId');
      query._id = { $in: assignments };
    }

    // Filter by client
    if (req.query.clientId) {
      query.clientId = req.query.clientId;
    }

    // Filter by tags
    if (req.query.tags) {
      const tags = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];
      query.tags = { $in: tags };
    }

    const projects = await Project.find(query)
      .populate('clientId', 'name industry')
      .populate('managerId', 'name email')
      .sort({ startDate: -1 });

    // Calculate utilization for each project
    const projectsWithUtilization = await Promise.all(
      projects.map(async (project) => {
        const now = new Date();
        const activeAssignments = await Assignment.find({
          projectId: project._id,
          status: 'approved',
          startDate: { $lte: now },
          endDate: { $gte: now },
        });

        const totalUtilization = activeAssignments.reduce((sum, ass) => sum + ass.utilization, 0);
        const developerCount = new Set(activeAssignments.map(ass => ass.developerId.toString())).size;

        return {
          ...project.toObject(),
          totalUtilization,
          developerCount,
          assignmentCount: activeAssignments.length,
        };
      })
    );

    res.json({
      success: true,
      count: projectsWithUtilization.length,
      data: projectsWithUtilization,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project with assignments
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    let project;

    if (req.user.role === 'manager') {
      project = await Project.findOne({
        _id: req.params.id,
        managerId: req.user._id,
      })
        .populate('clientId', 'name industry')
        .populate('managerId', 'name email');
    } else if (req.user.role === 'employee') {
      // Check if user is assigned to this project
      const assignment = await Assignment.findOne({
        projectId: req.params.id,
        developerId: req.user._id,
      });
      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this project',
        });
      }
      project = await Project.findById(req.params.id)
        .populate('clientId', 'name industry')
        .populate('managerId', 'name email');
    } else {
      project = await Project.findById(req.params.id)
        .populate('clientId', 'name industry')
        .populate('managerId', 'name email');
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Get all assignments for this project
    const assignments = await Assignment.find({ projectId: project._id })
      .populate('developerId', 'name email skills')
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ startDate: -1 });

    // Calculate total utilization
    const now = new Date();
    const activeAssignments = assignments.filter(ass => {
      return ass.status === 'approved' &&
        ass.startDate <= now &&
        ass.endDate >= now;
    });

    const totalUtilization = activeAssignments.reduce((sum, ass) => sum + ass.utilization, 0);

    res.json({
      success: true,
      data: {
        ...project.toObject(),
        assignments,
        totalUtilization,
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

// @route   POST /api/projects
// @desc    Create new project
// @access  Private/Admin/Manager
router.post('/', protect, async (req, res) => {
  try {
    const { name, clientId, managerId, startDate, endDate, tags } = req.body;

    // Managers can only create projects for themselves
    if (req.user.role === 'manager') {
      if (managerId && managerId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Managers can only create projects for themselves',
        });
      }
    }

    const project = await Project.create({
      name,
      clientId,
      managerId: managerId || req.user._id,
      startDate,
      endDate,
      tags: tags || [],
    });

    await project.populate('clientId', 'name industry');
    await project.populate('managerId', 'name email');

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private/Admin/Manager
router.put('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Managers can only update their own projects
    if (req.user.role === 'manager' && project.managerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project',
      });
    }

    const { name, clientId, managerId, startDate, endDate, tags, status } = req.body;

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        name,
        clientId,
        managerId,
        startDate,
        endDate,
        tags,
        status,
      },
      { new: true, runValidators: true }
    )
      .populate('clientId', 'name industry')
      .populate('managerId', 'name email');

    res.json({
      success: true,
      data: updatedProject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private/Admin
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete projects',
      });
    }

    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Also delete all assignments for this project
    await Assignment.deleteMany({ projectId: req.params.id });

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
