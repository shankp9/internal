const express = require('express');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/search
// @desc    Search across clients, projects, assignments, and developers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json({
        success: true,
        data: {
          clients: [],
          projects: [],
          assignments: [],
          developers: [],
        },
      });
    }

    const searchQuery = { $regex: q, $options: 'i' };
    const results = {
      clients: [],
      projects: [],
      assignments: [],
      developers: [],
    };

    // Search clients (only for admin and managers)
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      let clientQuery = { name: searchQuery };
      
      // Managers can only see clients where they manage projects
      if (req.user.role === 'manager') {
        const managerProjects = await Project.find({ managerId: req.user._id }).distinct('clientId');
        clientQuery._id = { $in: managerProjects };
        clientQuery.name = searchQuery;
      }

      const clients = await Client.find(clientQuery)
        .populate('accountManagerId', 'name email')
        .limit(10)
        .select('name industry accountManagerId')
        .lean();

      results.clients = clients.map(client => ({
        id: client._id,
        name: client.name,
        type: 'client',
        href: `/clients/${client._id}`,
        subtitle: client.industry || 'Client',
      }));
    }

    // Search projects
    let projectQuery = { name: searchQuery };
    
    if (req.user.role === 'manager') {
      projectQuery.managerId = req.user._id;
    } else if (req.user.role === 'employee') {
      const assignments = await Assignment.find({ developerId: req.user._id }).distinct('projectId');
      projectQuery._id = { $in: assignments };
      projectQuery.name = searchQuery;
    }

    const projects = await Project.find(projectQuery)
      .populate('clientId', 'name')
      .populate('managerId', 'name email')
      .limit(10)
      .select('name clientId managerId')
      .lean();

    results.projects = projects.map(project => ({
      id: project._id,
      name: project.name,
      type: 'project',
      href: `/projects/${project._id}`,
      subtitle: project.clientId?.name || 'Project',
    }));

    // Search assignments
    let assignmentQuery = {};
    
    if (req.user.role === 'employee') {
      assignmentQuery.developerId = req.user._id;
    } else if (req.user.role === 'manager') {
      const managerProjects = await Project.find({ managerId: req.user._id }).distinct('_id');
      assignmentQuery.projectId = { $in: managerProjects };
    }

    const assignments = await Assignment.find(assignmentQuery)
      .populate('projectId', 'name clientId')
      .populate('developerId', 'name email')
      .limit(10)
      .select('projectId developerId status')
      .lean();

    // Filter assignments by project name or developer name
    const filteredAssignments = assignments.filter(assignment => {
      const projectName = assignment.projectId?.name || '';
      const developerName = assignment.developerId?.name || '';
      return projectName.toLowerCase().includes(q.toLowerCase()) ||
             developerName.toLowerCase().includes(q.toLowerCase());
    });

    results.assignments = filteredAssignments.map(assignment => ({
      id: assignment._id,
      name: assignment.projectId?.name || 'Assignment',
      type: 'assignment',
      href: `/assignments`,
      subtitle: assignment.developerId?.name || 'Assignment',
    }));

    // Search developers (only for admin and managers)
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      let developerQuery = {
        role: 'employee',
        isActive: true,
        $or: [
          { name: searchQuery },
          { email: searchQuery },
          { skills: { $in: [new RegExp(q, 'i')] } },
        ],
      };

      if (req.user.role === 'manager') {
        developerQuery.managerId = req.user._id;
      }

      const developers = await User.find(developerQuery)
        .populate('managerId', 'name email')
        .limit(10)
        .select('name email skills managerId')
        .lean();

      results.developers = developers.map(developer => ({
        id: developer._id,
        name: developer.name,
        type: 'developer',
        href: `/developers/${developer._id}`,
        subtitle: developer.skills?.join(', ') || 'Developer',
      }));
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

