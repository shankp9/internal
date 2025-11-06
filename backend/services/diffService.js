const { diffLines } = require('diff');

/**
 * Calculate diff between two PRD versions
 */
function calculateDiff(oldContent, newContent) {
  const diff = diffLines(oldContent, newContent);
  
  let added = 0;
  let removed = 0;
  let changes = [];
  
  diff.forEach((part) => {
    if (part.added) {
      added += part.count;
      changes.push({
        type: 'added',
        value: part.value,
        count: part.count,
      });
    } else if (part.removed) {
      removed += part.count;
      changes.push({
        type: 'removed',
        value: part.value,
        count: part.count,
      });
    }
  });

  return {
    added,
    removed,
    changes,
    diff,
  };
}

/**
 * Generate a summary of changes
 */
function generateChangeSummary(diffResult) {
  const { added, removed, changes } = diffResult;
  
  if (added === 0 && removed === 0) {
    return 'No changes detected';
  }

  const summary = [];
  
  if (added > 0) {
    summary.push(`Added ${added} line(s)`);
  }
  
  if (removed > 0) {
    summary.push(`Removed ${removed} line(s)`);
  }

  // Analyze major changes
  const majorAdditions = changes
    .filter(c => c.type === 'added' && c.value.trim().length > 100)
    .slice(0, 3);
  
  if (majorAdditions.length > 0) {
    summary.push('Major additions detected');
  }

  return summary.join(', ');
}

/**
 * Create formatted diff for display
 */
function formatDiffForDisplay(diffResult) {
  const { diff } = diffResult;
  const formatted = [];
  
  diff.forEach((part, index) => {
    const prefix = part.added ? '+' : part.removed ? '-' : ' ';
    const lines = part.value.split('\n').filter(line => line.trim() !== '');
    
    lines.forEach(line => {
      formatted.push({
        line: `${prefix} ${line}`,
        type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
      });
    });
  });

  return formatted;
}

module.exports = {
  calculateDiff,
  generateChangeSummary,
  formatDiffForDisplay,
};

