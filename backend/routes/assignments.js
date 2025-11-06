const express = require('express');
const Assignment = require('../models/Assignment');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { generateTaskBreakdown } = require('../services/taskBreakdownService');

const router = express.Router();

// @route   GET /api/assignments
// @desc    Get all assignments
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    // Employees can only see their own assignments
    if (req.user.role === 'employee') {
      query.developerId = req.user._id;
    }

    // Managers can see assignments for their projects
    if (req.user.role === 'manager') {
      const managerProjects = await Project.find({ managerId: req.user._id }).distinct('_id');
      query.projectId = { $in: managerProjects };
    }

    // Filter by project
    if (req.query.projectId) {
      query.projectId = req.query.projectId;
    }

    // Filter by developer
    if (req.query.developerId) {
      query.developerId = req.query.developerId;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by tags
    if (req.query.tags) {
      const tags = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];
      query.tags = { $in: tags };
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      query.$or = [];
      if (req.query.startDate) {
        query.$or.push({ endDate: { $gte: new Date(req.query.startDate) } });
      }
      if (req.query.endDate) {
        query.$or.push({ startDate: { $lte: new Date(req.query.endDate) } });
      }
    }

    const assignments = await Assignment.find(query)
      .populate('projectId', 'name clientId')
      .populate('developerId', 'name email skills')
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/assignments/:id/task-breakdown
// @desc    Get task breakdown in markdown format
// @access  Private
router.get('/:id/task-breakdown', protect, async (req, res) => {
  try {
    let assignment;

    if (req.user.role === 'employee') {
      assignment = await Assignment.findOne({
        _id: req.params.id,
        developerId: req.user._id,
      });
    } else if (req.user.role === 'manager') {
      const managerProjects = await Project.find({ managerId: req.user._id }).distinct('_id');
      assignment = await Assignment.findOne({
        _id: req.params.id,
        projectId: { $in: managerProjects },
      });
    } else {
      assignment = await Assignment.findById(req.params.id);
    }

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Return null for markdown if it's empty or doesn't exist
    const markdown = assignment.taskBreakdownMarkdown && assignment.taskBreakdownMarkdown.trim() !== ''
      ? assignment.taskBreakdownMarkdown
      : null;

    res.json({
      success: true,
      data: {
        markdown,
        generatedAt: assignment.taskBreakdownGeneratedAt,
        lastUpdated: assignment.taskBreakdownLastUpdated,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/assignments/:id/generate-breakdown
// @desc    Regenerate task breakdown using AI
// @access  Private/Admin/Manager
router.post('/:id/generate-breakdown', protect, async (req, res) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Employees cannot generate task breakdowns',
      });
    }

    let assignment;

    if (req.user.role === 'manager') {
      const managerProjects = await Project.find({ managerId: req.user._id }).distinct('_id');
      assignment = await Assignment.findOne({
        _id: req.params.id,
        projectId: { $in: managerProjects },
      });
    } else {
      assignment = await Assignment.findById(req.params.id);
    }

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Populate project and developer
    await assignment.populate([
      { path: 'projectId', select: 'name clientId managerId tags' },
      { path: 'developerId', select: 'name email skills' },
    ]);

    // Generate task breakdown
    const taskBreakdownMarkdown = await generateTaskBreakdown(
      assignment,
      assignment.projectId,
      assignment.developerId
    );

    assignment.taskBreakdownMarkdown = taskBreakdownMarkdown;
    assignment.taskBreakdownGeneratedAt = new Date();
    assignment.taskBreakdownLastUpdated = null; // Reset since it's regenerated
    await assignment.save();

    res.json({
      success: true,
      data: {
        markdown: assignment.taskBreakdownMarkdown,
        generatedAt: assignment.taskBreakdownGeneratedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/assignments/:id/task-breakdown
// @desc    Update task breakdown (edit mode for managers/admins)
// @access  Private/Admin/Manager
router.put('/:id/task-breakdown', protect, async (req, res) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Employees cannot update task breakdowns',
      });
    }

    const { markdown } = req.body;

    if (!markdown || typeof markdown !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Markdown content is required',
      });
    }

    let assignment;

    if (req.user.role === 'manager') {
      const managerProjects = await Project.find({ managerId: req.user._id }).distinct('_id');
      assignment = await Assignment.findOne({
        _id: req.params.id,
        projectId: { $in: managerProjects },
      });
    } else {
      assignment = await Assignment.findById(req.params.id);
    }

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    assignment.taskBreakdownMarkdown = markdown;
    assignment.taskBreakdownLastUpdated = new Date();
    await assignment.save();

    res.json({
      success: true,
      data: {
        markdown: assignment.taskBreakdownMarkdown,
        generatedAt: assignment.taskBreakdownGeneratedAt,
        lastUpdated: assignment.taskBreakdownLastUpdated,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/assignments/:id
// @desc    Get single assignment
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    let assignment;

    if (req.user.role === 'employee') {
      assignment = await Assignment.findOne({
        _id: req.params.id,
        developerId: req.user._id,
      });
    } else if (req.user.role === 'manager') {
      const managerProjects = await Project.find({ managerId: req.user._id }).distinct('_id');
      assignment = await Assignment.findOne({
        _id: req.params.id,
        projectId: { $in: managerProjects },
      });
    } else {
      assignment = await Assignment.findById(req.params.id);
    }

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    await assignment.populate('projectId', 'name clientId managerId');
    await assignment.populate([
      { path: 'developerId', select: 'name email skills' },
      { path: 'submittedBy', select: 'name email' },
      { path: 'approvedBy', select: 'name email' },
    ]);

    // Populate structured task breakdown if it exists
    if (assignment.taskBreakdown) {
      await assignment.populate({
        path: 'taskBreakdown',
        select: 'taskDescription description subtasks acceptanceCriteria technicalRequirements estimatedEffortHours',
      });
    }

    // Populate assignment suggestion if it exists to get AI-generated details
    if (assignment.assignmentSuggestionId) {
      await assignment.populate({
        path: 'assignmentSuggestionId',
        select: 'title description reasoning priority meetingId taskBreakdown',
        populate: [
          {
            path: 'meetingId',
            select: 'title date',
          },
          {
            path: 'taskBreakdown',
            select: 'taskDescription description subtasks acceptanceCriteria technicalRequirements estimatedEffortHours',
          },
        ],
      });
    }

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/assignments
// @desc    Create new assignment
// @access  Private/Admin/Manager
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Employees cannot create assignments',
      });
    }

    const { projectId, developerId, utilization, startDate, endDate, tags } = req.body;

    // Verify project exists and manager has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Managers can only create assignments for their projects
    if (req.user.role === 'manager' && project.managerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create assignments for this project',
      });
    }

    // Validate utilization
    if (utilization < 0 || utilization > 100) {
      return res.status(400).json({
        success: false,
        message: 'Utilization must be between 0 and 100',
      });
    }

    const assignment = await Assignment.create({
      projectId,
      developerId,
      utilization,
      startDate,
      endDate,
      tags: tags || [],
      status: 'pending',
      submittedBy: req.user._id,
    });

    await assignment.populate([
      { path: 'projectId', select: 'name clientId managerId' },
      { path: 'developerId', select: 'name email skills' },
      { path: 'submittedBy', select: 'name email' },
    ]);

    // Auto-generate task breakdown
    try {
      const taskBreakdownMarkdown = await generateTaskBreakdown(assignment, assignment.projectId, assignment.developerId);
      if (taskBreakdownMarkdown && taskBreakdownMarkdown.trim()) {
        assignment.taskBreakdownMarkdown = taskBreakdownMarkdown;
        assignment.taskBreakdownGeneratedAt = new Date();
        await assignment.save();
        console.log(`[Assignment] Task breakdown generated successfully for assignment ${assignment._id}`);
      } else {
        console.warn(`[Assignment] Task breakdown generation returned empty content for assignment ${assignment._id}`);
      }
    } catch (breakdownError) {
      // Log error but don't fail the assignment creation
      console.error(`[Assignment] Failed to generate task breakdown for assignment ${assignment._id}:`, breakdownError.message || breakdownError);
      // Task breakdown can be generated later via the generate-breakdown endpoint
    }

    // Create notifications
    try {
      // Notify developer about new assignment
      await Notification.create({
        userId: developerId,
        type: 'assignment_assigned',
        message: `You have been assigned to project "${assignment.projectId.name}" with ${utilization}% utilization`,
        priority: 'medium',
        relatedId: assignment._id,
        relatedModel: 'Assignment',
      });

      // Notify manager if assignment is created by admin or another manager
      if (assignment.projectId.managerId && 
          assignment.projectId.managerId.toString() !== req.user._id.toString()) {
        await Notification.create({
          userId: assignment.projectId.managerId,
          type: 'assignment_created',
          message: `A new assignment has been created for project "${assignment.projectId.name}" by ${assignment.submittedBy.name}`,
          priority: 'medium',
          relatedId: assignment._id,
          relatedModel: 'Assignment',
        });
      }
    } catch (notifError) {
      // Log error but don't fail the assignment creation
      console.error('Failed to create notifications:', notifError);
    }

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/assignments/:id
// @desc    Update assignment
// @access  Private/Admin/Manager
router.put('/:id', protect, async (req, res) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Employees cannot update assignments',
      });
    }

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Managers can only update assignments for their projects
    if (req.user.role === 'manager') {
      const project = await Project.findById(assignment.projectId);
      if (project.managerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this assignment',
        });
      }
    }

    // If updating, set back to pending if it was approved
    if (assignment.status === 'approved') {
      req.body.status = 'pending';
      req.body.approvedBy = null;
      req.body.approvedAt = null;
    }

    const { projectId, developerId, utilization, startDate, endDate, tags } = req.body;

    // Validate utilization
    if (utilization !== undefined && (utilization < 0 || utilization > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Utilization must be between 0 and 100',
      });
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      {
        projectId,
        developerId,
        utilization,
        startDate,
        endDate,
        tags,
        submittedBy: req.user._id,
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'projectId', select: 'name clientId' },
      { path: 'developerId', select: 'name email skills' },
      { path: 'submittedBy', select: 'name email' },
    ]);

    res.json({
      success: true,
      data: updatedAssignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/assignments/:id/approve
// @desc    Approve assignment
// @access  Private/Admin
router.post('/:id/approve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can approve assignments',
      });
    }

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    if (assignment.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Assignment is already approved',
      });
    }

    // Check for overlapping assignments that would exceed 100%
    const now = new Date();
    const overlappingAssignments = await Assignment.find({
      developerId: assignment.developerId,
      status: 'approved',
      _id: { $ne: assignment._id },
      $or: [
        { startDate: { $lte: assignment.endDate }, endDate: { $gte: assignment.startDate } },
      ],
    });

    const totalUtilization = overlappingAssignments.reduce((sum, ass) => {
      // Calculate overlap period utilization
      const overlapStart = new Date(Math.max(ass.startDate, assignment.startDate));
      const overlapEnd = new Date(Math.min(ass.endDate, assignment.endDate));
      if (overlapStart <= overlapEnd) {
        return sum + ass.utilization;
      }
      return sum;
    }, 0);

    if (totalUtilization + assignment.utilization > 100) {
      return res.status(400).json({
        success: false,
        message: `Approving this assignment would exceed 100% utilization. Current overlap: ${totalUtilization}%, New: ${assignment.utilization}%`,
      });
    }

    assignment.status = 'approved';
    assignment.approvedBy = req.user._id;
    assignment.approvedAt = new Date();
    assignment.rejectionReason = null;

    // Auto-generate or regenerate task breakdown when approved
    try {
      await assignment.populate([
        { path: 'projectId', select: 'name clientId managerId tags' },
        { path: 'developerId', select: 'name email skills' },
      ]);
      
      const taskBreakdownMarkdown = await generateTaskBreakdown(assignment, assignment.projectId, assignment.developerId);
      if (taskBreakdownMarkdown && taskBreakdownMarkdown.trim()) {
        assignment.taskBreakdownMarkdown = taskBreakdownMarkdown;
        assignment.taskBreakdownGeneratedAt = new Date();
        assignment.taskBreakdownLastUpdated = null; // Reset since it's regenerated
        console.log(`[Assignment] Task breakdown generated successfully for approved assignment ${assignment._id}`);
      } else {
        console.warn(`[Assignment] Task breakdown generation returned empty content for approved assignment ${assignment._id}`);
      }
    } catch (breakdownError) {
      // Log error but don't fail the approval
      console.error(`[Assignment] Failed to generate task breakdown for approved assignment ${assignment._id}:`, breakdownError.message || breakdownError);
      // Task breakdown can be generated later via the generate-breakdown endpoint
    }

    await assignment.save();

    await assignment.populate([
      { path: 'projectId', select: 'name clientId' },
      { path: 'developerId', select: 'name email skills' },
      { path: 'approvedBy', select: 'name email' },
    ]);

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/assignments/:id/reject
// @desc    Reject assignment
// @access  Private/Admin
router.post('/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can reject assignments',
      });
    }

    const { rejectionReason } = req.body;

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    assignment.status = 'rejected';
    assignment.approvedBy = req.user._id;
    assignment.approvedAt = new Date();
    assignment.rejectionReason = rejectionReason || 'No reason provided';

    await assignment.save();

    await assignment.populate([
      { path: 'projectId', select: 'name clientId' },
      { path: 'developerId', select: 'name email skills' },
      { path: 'approvedBy', select: 'name email' },
    ]);

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   DELETE /api/assignments/:id
// @desc    Delete assignment
// @access  Private/Admin/Manager
router.delete('/:id', protect, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Managers can only delete assignments for their projects
    if (req.user.role === 'manager') {
      const project = await Project.findById(assignment.projectId);
      if (project.managerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this assignment',
        });
      }
    }

    await Assignment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Assignment deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
