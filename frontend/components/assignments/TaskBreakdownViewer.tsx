'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TaskBreakdownViewerProps {
  markdown: string;
  loading?: boolean;
  onCopy?: () => void;
}

export default function TaskBreakdownViewer({ markdown, loading = false, onCopy }: TaskBreakdownViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      toast.success('Markdown copied to clipboard!');
      if (onCopy) {
        onCopy();
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-main animate-spin" />
          <p className="text-sm text-text-muted">Generating task breakdown...</p>
        </div>
      </div>
    );
  }

  if (!markdown || markdown.trim() === '') {
    return (
      <div className="text-center py-12 text-text-muted">
        <p className="text-sm">No task breakdown available</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Copy Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-background-primary border border-border-default rounded-lg hover:bg-background-secondary transition-all shadow-soft text-sm font-medium text-text-heading"
          title="Copy markdown to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-system-active-text" />
              <span className="text-system-active-text">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Markdown</span>
            </>
          )}
        </button>
      </div>

      {/* Markdown Content */}
      <div className="bg-background-primary rounded-xl border border-border-light p-6 sm:p-8 overflow-auto">
        <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom styling for headings
              h1: ({ node, ...props }) => (
                <h1 className="text-3xl font-bold text-text-heading mt-8 mb-4 pb-2 border-b border-border-default" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-2xl font-bold text-text-heading mt-6 mb-3" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-xl font-semibold text-text-heading mt-5 mb-2" {...props} />
              ),
              h4: ({ node, ...props }) => (
                <h4 className="text-lg font-semibold text-text-heading mt-4 mb-2" {...props} />
              ),
              // Custom styling for lists
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside space-y-2 my-4 text-text-body" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside space-y-2 my-4 text-text-body" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="ml-4 text-text-body" {...props} />
              ),
              // Custom styling for code blocks
              code: ({ node, inline, ...props }: any) => {
                if (inline) {
                  return (
                    <code
                      className="px-1.5 py-0.5 bg-background-secondary text-primary-main rounded text-sm font-mono"
                      {...props}
                    />
                  );
                }
                return (
                  <code
                    className="block p-4 bg-background-secondary rounded-lg text-sm font-mono overflow-x-auto my-4"
                    {...props}
                  />
                );
              },
              pre: ({ node, ...props }) => (
                <pre className="bg-background-secondary rounded-lg p-4 overflow-x-auto my-4" {...props} />
              ),
              // Custom styling for paragraphs
              p: ({ node, ...props }) => (
                <p className="text-text-body my-3 leading-relaxed" {...props} />
              ),
              // Custom styling for blockquotes
              blockquote: ({ node, ...props }) => (
                <blockquote
                  className="border-l-4 border-primary-main pl-4 my-4 italic text-text-body bg-primary-50 py-2 rounded-r"
                  {...props}
                />
              ),
              // Custom styling for links
              a: ({ node, ...props }) => (
                <a
                  className="text-primary-main hover:text-primary-hover underline"
                  {...props}
                />
              ),
              // Custom styling for strong/bold
              strong: ({ node, ...props }) => (
                <strong className="font-bold text-text-heading" {...props} />
              ),
              // Custom styling for tables
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full border-collapse border border-border-default" {...props} />
                </div>
              ),
              th: ({ node, ...props }) => (
                <th
                  className="border border-border-default px-4 py-2 bg-background-secondary font-semibold text-text-heading text-left"
                  {...props}
                />
              ),
              td: ({ node, ...props }) => (
                <td
                  className="border border-border-default px-4 py-2 text-text-body"
                  {...props}
                />
              ),
              // Custom styling for checkboxes (task lists)
              input: ({ node, ...props }: any) => {
                if (props.type === 'checkbox') {
                  return (
                    <input
                      type="checkbox"
                      className="mr-2 w-4 h-4 text-primary-main border-border-default rounded focus:ring-primary-main"
                      disabled
                      {...props}
                    />
                  );
                }
                return <input {...props} />;
              },
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

