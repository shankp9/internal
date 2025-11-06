const express = require('express');
const DeveloperTask = require('../models/DeveloperTask');
const Assignment = require('../models/Assignment');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/assignments/:id/tasks
// @desc    Get detailed tasks for an assignment
// @access  Private
router.get('/assignments/:id/tasks', protect, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    const tasks = await DeveloperTask.find({
      assignmentId: req.params.id,
    })
      .populate('developerId', 'name email skills')
      .populate('projectId', 'name')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/developers/:id/tasks
// @desc    Get all tasks assigned to a developer across projects
// @access  Private
router.get('/developers/:id/tasks', protect, async (req, res) => {
  try {
    // Verify user can access this developer's tasks
    if (req.user.role === 'employee' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view other developers\' tasks',
      });
    }

    const { status, projectId } = req.query;
    const query = { developerId: req.params.id };

    if (status) {
      query.status = status;
    }

    if (projectId) {
      query.projectId = projectId;
    }

    const tasks = await DeveloperTask.find(query)
      .populate('projectId', 'name clientId')
      .populate('assignmentId')
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/developer-tasks/:id
// @desc    Update task status or details
// @access  Private
router.put('/developer-tasks/:id', protect, async (req, res) => {
  try {
    const task = await DeveloperTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify user can update this task
    if (req.user.role === 'employee' && task.developerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task',
      });
    }

    const { status, notes, subtasks } = req.body;

    if (status) {
      task.status = status;
      if (status === 'completed') {
        task.completedAt = new Date();
      }
    }

    if (notes) {
      task.notes.push({
        user: req.user._id,
        note: notes,
        createdAt: new Date(),
      });
    }

    if (subtasks) {
      task.subtasks = subtasks;
    }

    await task.save();
    await task.populate('developerId', 'name email');
    await task.populate('projectId', 'name');

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

