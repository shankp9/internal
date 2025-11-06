'use client';

import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface TaskBreakdownViewProps {
  taskBreakdown: any;
}

export default function TaskBreakdownView({ taskBreakdown }: TaskBreakdownViewProps) {
  if (!taskBreakdown) {
    return <div className="text-sm text-text-light">No task breakdown available</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h5 className="font-semibold text-text-heading mb-2">Task Description</h5>
        <p className="text-sm text-text-body">{taskBreakdown.taskDescription || taskBreakdown.description}</p>
      </div>

      {taskBreakdown.subtasks && taskBreakdown.subtasks.length > 0 && (
        <div>
          <h5 className="font-semibold text-text-heading mb-2">Subtasks</h5>
          <ul className="space-y-2">
            {taskBreakdown.subtasks.map((subtask: any, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Circle className="w-4 h-4 mt-0.5 text-text-light flex-shrink-0" />
                <div>
                  <p className="text-text-heading font-medium">{subtask.title}</p>
                  {subtask.description && (
                    <p className="text-text-body text-xs mt-1">{subtask.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {taskBreakdown.acceptanceCriteria && taskBreakdown.acceptanceCriteria.length > 0 && (
        <div>
          <h5 className="font-semibold text-text-heading mb-2">Acceptance Criteria</h5>
          <ul className="space-y-1">
            {taskBreakdown.acceptanceCriteria.map((criterion: string, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span className="text-text-body">{criterion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {taskBreakdown.technicalRequirements && taskBreakdown.technicalRequirements.length > 0 && (
        <div>
          <h5 className="font-semibold text-text-heading mb-2">Technical Requirements</h5>
          <ul className="space-y-1">
            {taskBreakdown.technicalRequirements.map((req: string, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 text-primary-main flex-shrink-0" />
                <span className="text-text-body">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {taskBreakdown.estimatedEffortHours && (
        <div className="text-sm text-text-light">
          Estimated effort: {taskBreakdown.estimatedEffortHours} hours
        </div>
      )}
    </div>
  );
}

