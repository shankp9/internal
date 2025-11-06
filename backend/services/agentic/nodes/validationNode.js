/**
 * Validation Node
 * Validates all generated content before final output
 */
async function validationNode(state) {
  const startTime = Date.now();
  const { matchedAssignments, prdUpdate, errors } = state;

  console.log('[Validation] Starting validation...');
  console.log(`[Validation] Matched assignments count: ${matchedAssignments?.length || 0}`);
  console.log(`[Validation] PRD update exists: ${!!prdUpdate}`);

  // If no assignments were matched, that's okay if we're just generating PRD
  // Don't treat it as an error if PRD was generated successfully
  if ((!matchedAssignments || matchedAssignments.length === 0) && !prdUpdate) {
    console.log('[Validation] No assignments and no PRD - returning error');
    return {
      ...state,
      suggestions: [],
      errors: [...(errors || []), 'No assignments were matched to developers'],
    };
  }
  
  // If no assignments, return empty suggestions but keep PRD if it exists
  if (!matchedAssignments || matchedAssignments.length === 0) {
    console.log('[Validation] No assignments but PRD exists - returning empty suggestions');
    return {
      ...state,
      suggestions: [],
      errors: errors || [],
    };
  }

  // Validate each suggestion has required fields
  const validatedSuggestions = [];
  const validationErrors = [...(errors || [])];

  console.log(`[Validation] Processing ${matchedAssignments.length} matched assignments...`);
  
  matchedAssignments.forEach((item, index) => {
    const { assignment, breakdown, match } = item;
    
    // If no developer matched OR match score is very low (< 30), mark for manual assignment
    const matchScore = match?.matchScore || 0;
    const hasLowMatch = !match || !match.developerId || matchScore < 30;
    
    if (hasLowMatch) {
      console.log(`[Validation] Low/no match (score: ${matchScore}) for assignment: ${assignment.title || `Assignment ${index + 1}`}`);
      validatedSuggestions.push({
        title: assignment.title || `Assignment ${index + 1}`,
        description: assignment.description || '',
        developerId: match?.developerId || null, // Include if available, even if low match
        developerName: match?.developerName || null,
        utilization: assignment.estimatedUtilization || 50,
        startDate: assignment.suggestedStartDate || new Date().toISOString(),
        endDate: assignment.suggestedEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        tags: assignment.tags || [],
        priority: assignment.priority || 'medium',
        reasoning: match?.reasoning || assignment.reasoning || 
          `Low match score (${matchScore}) - manager should review and assign from existing resources or add new resources`,
        taskBreakdown: breakdown,
        matchScore: matchScore,
        needsManualAssignment: true, // Flag for frontend/manager review
      });
      return;
    }

    validatedSuggestions.push({
      title: assignment.title || `Assignment ${index + 1}`,
      description: assignment.description || '',
      developerId: match.developerId,
      developerName: match.developerName || 'Unknown',
      utilization: match.recommendedUtilization || assignment.estimatedUtilization || 50,
      startDate: assignment.suggestedStartDate || new Date().toISOString(),
      endDate: assignment.suggestedEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      tags: assignment.tags || [],
      priority: assignment.priority || 'medium',
      reasoning: match.reasoning || assignment.reasoning || '',
      taskBreakdown: breakdown,
      matchScore: match.matchScore || 0,
      needsManualAssignment: false,
    });
  });

  const endTime = Date.now();
  console.log(`[Validation] Completed in ${endTime - startTime}ms`);
  console.log(`[Validation] Validated ${validatedSuggestions.length} suggestions`);

  return {
    ...state,
    suggestions: validatedSuggestions,
    errors: validationErrors,
  };
}

module.exports = validationNode;

