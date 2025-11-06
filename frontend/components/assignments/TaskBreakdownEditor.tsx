'use client';

import { useState } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import TaskBreakdownViewer from './TaskBreakdownViewer';

interface TaskBreakdownEditorProps {
  markdown: string;
  onSave: (markdown: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function TaskBreakdownEditor({ markdown: initialMarkdown, onSave, onCancel, loading = false }: TaskBreakdownEditorProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = async () => {
    if (!markdown.trim()) {
      toast.error('Markdown content cannot be empty');
      return;
    }

    setSaving(true);
    try {
      await onSave(markdown);
      toast.success('Task breakdown updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update task breakdown');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-background-secondary rounded-lg p-4 border border-border-default">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 text-sm font-medium text-text-heading bg-background-primary border border-border-default rounded-lg hover:bg-background-secondary transition-all"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-text-body bg-background-primary border border-border-default rounded-lg hover:bg-background-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-main rounded-lg hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor/Preview */}
      {showPreview ? (
        <TaskBreakdownViewer markdown={markdown} />
      ) : (
        <div className="bg-background-primary rounded-xl border border-border-light overflow-hidden">
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="w-full h-[600px] p-6 font-mono text-sm text-text-body bg-background-primary border-0 focus:ring-0 focus:outline-none resize-none"
            placeholder="Enter markdown content here..."
            spellCheck={false}
          />
        </div>
      )}

      {/* Help Text */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <p className="text-sm text-text-body">
          <strong className="text-text-heading">Tip:</strong> This markdown will be formatted for Notion compatibility. 
          Use standard markdown syntax: headings (#), lists (- or 1.), checkboxes (- [ ]), code blocks (```), etc.
        </p>
      </div>
    </div>
  );
}

