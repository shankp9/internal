const { generateText } = require('./aiService');
const Project = require('../models/Project');
const User = require('../models/User');

/**
 * Generate detailed task breakdown markdown for an assignment
 * @param {Object} assignment - Assignment object
 * @param {Object} project - Project object (optional, will be fetched if not provided)
 * @param {Object} developer - Developer/User object (optional, will be fetched if not provided)
 * @returns {Promise<string>} Formatted markdown string
 */
async function generateTaskBreakdown(assignment, project = null, developer = null) {
  try {
    // Fetch project if not provided
    if (!project) {
      project = await Project.findById(assignment.projectId)
        .populate('clientId', 'name')
        .populate('managerId', 'name email');
    }

    // Fetch developer if not provided
    if (!developer) {
      developer = await User.findById(assignment.developerId).select('name email skills');
    }

    const systemPrompt = `You are a Senior Technical Analyst. Your role is to create detailed, actionable task breakdowns for developer assignments.

Generate a comprehensive task breakdown document in markdown format that:
- Is concise and to the point
- Provides clear, executable instructions
- Can be easily copied and pasted into Notion
- Includes specific implementation steps
- Considers the developer's skills and project context
- Uses professional, clear language

Format the output as clean markdown with proper headings, lists, and structure.`;

    const prompt = `Create a detailed task breakdown for the following assignment:

**Project Information:**
- Project Name: ${project?.name || 'N/A'}
- Client: ${project?.clientId?.name || 'N/A'}
- Project Manager: ${project?.managerId?.name || 'N/A'}
- Project Tags: ${project?.tags?.join(', ') || 'None'}

**Developer Information:**
- Name: ${developer?.name || 'N/A'}
- Email: ${developer?.email || 'N/A'}
- Skills: ${developer?.skills?.join(', ') || 'Not specified'}

**Assignment Details:**
- Utilization: ${assignment.utilization}%
- Start Date: ${new Date(assignment.startDate).toLocaleDateString()}
- End Date: ${new Date(assignment.endDate).toLocaleDateString()}
- Tags: ${assignment.tags?.join(', ') || 'None'}
- Status: ${assignment.status}

Generate a comprehensive task breakdown markdown document that includes:

1. **Title**: A clear, descriptive title for the assignment
2. **Overview**: Brief description of what needs to be accomplished
3. **Subtasks**: Numbered list of specific, actionable subtasks with detailed instructions
4. **Acceptance Criteria**: Checklist format (- [ ]) of what must be completed
5. **Technical Requirements**: Specific technical requirements and constraints
6. **Estimated Effort**: Time estimates and timeline information
7. **Notes**: Any additional context, dependencies, or important information

Format the output as clean, well-structured markdown that can be directly copied into Notion. Use proper markdown syntax:
- Use # for main title, ## for section headings
- Use numbered lists (1., 2., 3.) for subtasks
- Use bullet points (-) for requirements and notes
- Use checkboxes (- [ ]) for acceptance criteria
- Use **bold** for emphasis on important information
- Use code blocks (\`\`\`) for technical specifications if needed

Make the instructions specific, actionable, and easy to follow. Consider the developer's skills when writing technical requirements.`;

    const markdown = await generateText(prompt, {
      systemPrompt,
      functionName: 'generateTaskBreakdown',
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 3000,
      projectId: assignment.projectId?._id || assignment.projectId,
      userId: assignment.developerId?._id || assignment.developerId,
    });

    return markdown.trim();
  } catch (error) {
    console.error('[TaskBreakdownService] Error generating task breakdown:', error);
    throw new Error(`Failed to generate task breakdown: ${error.message}`);
  }
}

/**
 * Format task breakdown data into markdown
 * This is a helper function to convert structured data to markdown
 * @param {Object} breakdownData - Structured breakdown data
 * @returns {string} Formatted markdown string
 */
function formatBreakdownToMarkdown(breakdownData) {
  const {
    title = 'Task Breakdown',
    overview = '',
    subtasks = [],
    acceptanceCriteria = [],
    technicalRequirements = [],
    estimatedEffortHours = 0,
    notes = [],
  } = breakdownData;

  let markdown = `# ${title}\n\n`;

  if (overview) {
    markdown += `## Overview\n\n${overview}\n\n`;
  }

  if (subtasks && subtasks.length > 0) {
    markdown += `## Subtasks\n\n`;
    subtasks.forEach((subtask, index) => {
      markdown += `${index + 1}. **${subtask.title || `Subtask ${index + 1}`}**\n`;
      if (subtask.description) {
        markdown += `   - ${subtask.description}\n`;
      }
    });
    markdown += `\n`;
  }

  if (acceptanceCriteria && acceptanceCriteria.length > 0) {
    markdown += `## Acceptance Criteria\n\n`;
    acceptanceCriteria.forEach((criterion) => {
      markdown += `- [ ] ${criterion}\n`;
    });
    markdown += `\n`;
  }

  if (technicalRequirements && technicalRequirements.length > 0) {
    markdown += `## Technical Requirements\n\n`;
    technicalRequirements.forEach((req) => {
      markdown += `- ${req}\n`;
    });
    markdown += `\n`;
  }

  if (estimatedEffortHours > 0) {
    markdown += `## Estimated Effort\n\n`;
    markdown += `- **Hours**: ${estimatedEffortHours} hours\n`;
    markdown += `\n`;
  }

  if (notes && notes.length > 0) {
    markdown += `## Notes\n\n`;
    notes.forEach((note) => {
      markdown += `- ${note}\n`;
    });
    markdown += `\n`;
  }

  return markdown.trim();
}

module.exports = {
  generateTaskBreakdown,
  formatBreakdownToMarkdown,
};

