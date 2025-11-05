const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (with filters)
// @access  Private/Admin/Manager
router.get('/', protect, async (req, res) => {
  try {
    const { role, managerId } = req.query;
    let query = { isActive: true };

    // Managers can only see their team members
    if (req.user.role === 'manager') {
      query.managerId = req.user._id;
    }

    if (role) {
      query.role = role;
    }

    if (managerId && req.user.role === 'admin') {
      query.managerId = managerId;
    }

    const users = await User.find(query)
      .select('-password')
      .populate('managerId', 'name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    let user;

    // Employees can only see themselves
    if (req.user.role === 'employee' && req.params.id !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user',
      });
    }

    // Managers can only see their team members or themselves
    if (req.user.role === 'manager') {
      user = await User.findOne({
        _id: req.params.id,
        $or: [
          { _id: req.user._id },
          { managerId: req.user._id },
        ],
      }).populate('managerId', 'name email');
    } else {
      user = await User.findById(req.params.id).populate('managerId', 'name email');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, role, managerId, skills, isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        role,
        managerId,
        skills,
        isActive,
      },
      { new: true, runValidators: true }
    ).select('-password').populate('managerId', 'name email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (soft delete)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
