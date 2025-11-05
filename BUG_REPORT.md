# Bug Report - Resource Management System

## Critical Issues

### 1. **Missing Date Validation - Assignment Creation/Update**
**Location**: `backend/routes/assignments.js` (lines 131-223, 228-302)

**Issue**: No validation to ensure `endDate` is after `startDate`. This allows creating assignments with invalid date ranges.

**Impact**: High - Can cause data integrity issues and calculation errors.

**Fix Required**:
```javascript
// Add validation before creating assignment
if (new Date(startDate) >= new Date(endDate)) {
  return res.status(400).json({
    success: false,
    message: 'End date must be after start date',
  });
}
```

### 2. **Missing Date Validation - Project Creation/Update**
**Location**: `backend/routes/projects.js` (lines 158-194, 199-245)

**Issue**: No validation to ensure project `endDate` is after `startDate`.

**Impact**: High - Invalid project timelines can break reporting.

**Fix Required**: Add same date validation as above.

### 3. **Broken Date Range Filter Logic**
**Location**: `backend/routes/assignments.js` (lines 49-58)

**Issue**: The date range filter uses `$or` incorrectly. When both `startDate` and `endDate` are provided, it creates an OR condition instead of AND, which returns assignments that don't actually overlap with the requested range.

**Current Code**:
```javascript
if (req.query.startDate || req.query.endDate) {
  query.$or = [];
  if (req.query.startDate) {
    query.$or.push({ endDate: { $gte: new Date(req.query.startDate) } });
  }
  if (req.query.endDate) {
    query.$or.push({ startDate: { $lte: new Date(req.query.endDate) } });
  }
}
```

**Fix Required**:
```javascript
if (req.query.startDate || req.query.endDate) {
  query.$and = [];
  if (req.query.startDate) {
    query.$and.push({ endDate: { $gte: new Date(req.query.startDate) } });
  }
  if (req.query.endDate) {
    query.$and.push({ startDate: { $lte: new Date(req.query.endDate) } });
  }
}
```

### 4. **Authorization Bug - Manager Query Overwritten**
**Location**: `backend/routes/assignments.js` (lines 22-31)

**Issue**: When a manager queries assignments, if `projectId` is provided in query params, it overwrites the manager's filtered projects, allowing managers to see assignments from projects they don't manage.

**Current Code**:
```javascript
if (req.user.role === 'manager') {
  const managerProjects = await Project.find({ managerId: req.user._id }).distinct('_id');
  query.projectId = { $in: managerProjects };
}

// Filter by project
if (req.query.projectId) {
  query.projectId = req.query.projectId; // BUG: Overwrites manager filter
}
```

**Fix Required**:
```javascript
if (req.user.role === 'manager') {
  const managerProjects = await Project.find({ managerId: req.user._id }).distinct('_id');
  if (req.query.projectId) {
    // Verify the requested project belongs to manager
    if (!managerProjects.some(p => p.toString() === req.query.projectId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view assignments for this project',
      });
    }
    query.projectId = req.query.projectId;
  } else {
    query.projectId = { $in: managerProjects };
  }
} else if (req.query.projectId) {
  query.projectId = req.query.projectId;
}
```

## High Priority Issues

### 5. **Missing Developer Role Validation**
**Location**: `backend/routes/assignments.js` (lines 131-223)

**Issue**: When creating an assignment, the code doesn't verify that `developerId` is actually an employee (role: 'employee'). This allows assigning work to admins/managers.

**Impact**: Medium - Data integrity issue, could cause calculation errors.

**Fix Required**:
```javascript
// Verify developer is actually an employee
const developer = await User.findById(developerId);
if (!developer || developer.role !== 'employee' || !developer.isActive) {
  return res.status(400).json({
    success: false,
    message: 'Invalid developer. Must be an active employee.',
  });
}
```

### 6. **Missing Manager Role Validation**
**Location**: `backend/routes/projects.js` (lines 158-194)

**Issue**: When creating/updating a project, the code doesn't verify that `managerId` is actually a manager.

**Impact**: Medium - Data integrity issue.

**Fix Required**: Add validation to ensure managerId role is 'manager' or 'admin'.

### 7. **Incomplete Overlap Detection Logic**
**Location**: `backend/routes/assignments.js` (lines 332-358)

**Issue**: The overlap detection in the approve endpoint calculates total utilization but doesn't properly handle edge cases where assignments have partial overlaps. The calculation sums all overlapping assignment utilizations, but this might not be accurate if assignments don't fully overlap.

**Current Logic**:
```javascript
const totalUtilization = overlappingAssignments.reduce((sum, ass) => {
  const overlapStart = new Date(Math.max(ass.startDate, assignment.startDate));
  const overlapEnd = new Date(Math.min(ass.endDate, assignment.endDate));
  if (overlapStart <= overlapEnd) {
    return sum + ass.utilization; // BUG: Always adds full utilization
  }
  return sum;
}, 0);
```

**Impact**: Medium - May allow over-utilization in edge cases.

**Fix Required**: The current logic is actually correct for checking if approval would exceed 100% (since we're checking overlap period), but could be improved with better documentation.

### 8. **Password Update Not Hashed**
**Location**: `backend/routes/auth.js` (lines 161-219)

**Issue**: When updating profile password, the password is passed directly to `findByIdAndUpdate` without hashing. While the User model has a pre-save hook, `findByIdAndUpdate` bypasses middleware by default.

**Impact**: High - Passwords stored in plain text.

**Fix Required**:
```javascript
if (password) {
  const user = await User.findById(req.user._id);
  user.password = password; // This will trigger the pre-save hook
  await user.save();
  // Then update other fields separately if needed
}
```

OR use `findById` + `save()` instead of `findByIdAndUpdate`.

### 9. **Missing Null Checks on Populated Fields**
**Location**: Multiple locations

**Issue**: Code accesses properties of populated fields without checking if they exist (e.g., `assignment.projectId.name`, `developer.managerId?.name`).

**Examples**:
- `backend/routes/assignments.js:190` - `assignment.projectId.name` without null check
- `backend/routes/dashboard.js:337` - `dev.managerId?.name` (has optional chaining, but inconsistent)

**Impact**: Medium - Can cause runtime errors.

**Fix Required**: Add null checks or use optional chaining consistently.

### 10. **Date Comparison Without Time Normalization**
**Location**: Multiple locations

**Issue**: Date comparisons don't normalize time, which can cause issues with date-only comparisons.

**Example**: `ass.startDate <= now` should normalize times to midnight for accurate day-based comparisons.

**Impact**: Low-Medium - May cause off-by-one-day errors in edge cases.

## Medium Priority Issues

### 11. **Missing Input Sanitization**
**Location**: All routes

**Issue**: No input sanitization for string fields (XSS prevention, though this is backend). Text fields should be trimmed and validated.

**Impact**: Low - Frontend should handle this, but backend should validate.

### 12. **No Validation for Email Format in Registration**
**Location**: `backend/routes/auth.js` (line 19-66)

**Issue**: While express-validator is used for login, registration doesn't use it for validation.

**Impact**: Low - Mongoose schema may catch this, but explicit validation is better.

### 13. **Missing Index on Developer Utilization Queries**
**Location**: `backend/models/Assignment.js`

**Issue**: Frequent queries filter by `developerId`, `status`, and date range, but there's no compound index for these common query patterns.

**Impact**: Medium - Performance degradation as data grows.

**Fix Required**:
```javascript
assignmentSchema.index({ developerId: 1, status: 1, startDate: 1, endDate: 1 });
```

### 14. **Potential Race Condition in Approval**
**Location**: `backend/routes/assignments.js` (lines 332-365)

**Issue**: The approval check for overlapping assignments and the actual approval are not atomic. Between the check and approval, another assignment could be approved, causing over-utilization.

**Impact**: Low-Medium - Rare but possible in high-concurrency scenarios.

**Fix Required**: Consider using transactions or database-level constraints.

### 15. **Inconsistent Error Messages**
**Location**: Throughout codebase

**Issue**: Error messages are inconsistent - some return generic messages, others are more specific. Some expose internal errors in development mode.

**Impact**: Low - UX and security concern.

## Low Priority / Code Quality Issues

### 16. **Missing JWT_SECRET Validation**
**Location**: `backend/middleware/auth.js`

**Issue**: No check if `process.env.JWT_SECRET` exists before using it.

**Impact**: Low - Would fail at startup, but explicit check is better.

### 17. **Hardcoded Date Logic**
**Location**: `backend/routes/dashboard.js`, `backend/routes/developers.js`

**Issue**: Magic numbers for date calculations (30 days, 90 days, etc.) should be constants.

**Impact**: Low - Code maintainability.

### 18. **Missing Validation Schema**
**Location**: All routes

**Issue**: No centralized validation schema. Each route validates differently.

**Impact**: Low - Code maintainability and consistency.

### 19. **Unused Variable in Dashboard**
**Location**: `backend/routes/dashboard.js:333`

**Issue**: `const now = new Date();` is declared but not used in some sections.

**Impact**: Low - Code quality.

### 20. **Missing Client Validation**
**Location**: `backend/routes/projects.js`

**Issue**: When creating a project, doesn't verify that `clientId` exists and is active.

**Impact**: Medium - Foreign key constraint, but explicit check is better.

---

## Summary

**Total Issues Found**: 20
- **Critical**: 4
- **High Priority**: 6
- **Medium Priority**: 6
- **Low Priority**: 4

**Recommended Action**: Fix critical and high priority issues immediately before production deployment.

