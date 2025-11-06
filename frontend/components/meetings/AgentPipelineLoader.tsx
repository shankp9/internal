'use client';

import { useEffect, useState } from 'react';
import { joinMeetingPipeline, leaveMeetingPipeline, getPipelineSocket } from '@/lib/socket';
import { meetingsAPI } from '@/lib/api';
import { Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface AgentPipelineLoaderProps {
  meetingId: string;
}

type AgentStatus = 'pending' | 'active' | 'completed' | 'error';

interface Agent {
  id: string;
  name: string;
  displayName: string;
  status: AgentStatus;
  message?: string;
}

const AGENTS: Agent[] = [
  { id: 'transcript-analysis', name: 'transcript-analysis', displayName: 'Transcript Analysis', status: 'pending' },
  { id: 'prd-writer', name: 'prd-writer', displayName: 'PRD Writer', status: 'pending' },
  { id: 'project-manager', name: 'project-manager', displayName: 'Project Manager', status: 'pending' },
  { id: 'technical-analyst', name: 'technical-analyst', displayName: 'Technical Analyst', status: 'pending' },
  { id: 'resource-matcher', name: 'resource-matcher', displayName: 'Resource Matcher', status: 'pending' },
  { id: 'validation', name: 'validation', displayName: 'Validation', status: 'pending' },
];

export default function AgentPipelineLoader({ meetingId }: AgentPipelineLoaderProps) {
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Load initial pipeline status from database
  useEffect(() => {
    if (!meetingId) return;

    const loadInitialStatus = async () => {
      try {
        const response = await meetingsAPI.getPipelineStatus(meetingId);
        if (response.data.success && response.data.data) {
          const pipelineData = response.data.data;
          
          console.log('[Pipeline] Loaded initial status from database:', pipelineData);
          
          // Update overall status
          if (pipelineData.status === 'completed') {
            setIsCompleted(true);
            setCurrentProgress(100);
            setCurrentMessage('Pipeline completed successfully');
          } else if (pipelineData.status === 'failed') {
            setHasError(true);
            setCurrentMessage(pipelineData.error || 'Pipeline execution failed');
          } else {
            setCurrentProgress(pipelineData.progress || 0);
            setCurrentMessage(pipelineData.currentAgent ? `Running ${pipelineData.currentAgent}...` : 'Starting...');
          }

          // Update agent statuses from database
          if (pipelineData.agentResults) {
            setAgents((prevAgents) =>
              prevAgents.map((agent) => {
                const agentResult = pipelineData.agentResults[agent.id];
                if (agentResult) {
                  return {
                    ...agent,
                    status: agentResult.status as AgentStatus,
                    message: agentResult.error || (agentResult.status === 'completed' ? 'Completed' : ''),
                  };
                }
                // If pipeline is running and this agent hasn't started, check if it should be active
                if (pipelineData.status === 'running' && pipelineData.currentAgent === agent.id) {
                  return { ...agent, status: 'active' as AgentStatus };
                }
                return agent;
              })
            );
          }
        }
      } catch (error) {
        // If pipeline status doesn't exist yet, that's okay - it will be created when pipeline starts
        console.log('[Pipeline] No pipeline status found yet:', error);
      }
    };

    loadInitialStatus();
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId) return;

    const pipelineSocket = getPipelineSocket();
    if (!pipelineSocket) {
      console.warn('[Pipeline] Socket not available');
      return;
    }

    // Check if socket is connected
    setIsConnected(pipelineSocket.connected);
    console.log('[Pipeline] Socket connection status:', pipelineSocket.connected);

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleStatusUpdate = (data: any) => {
      const { currentAgent, status, progress, message } = data;
      
      console.log('[Pipeline] Status update received:', { currentAgent, status, progress, message });
      
      // Only update progress if it's greater than current (to prevent going backwards)
      setCurrentProgress((prev) => Math.max(prev, progress || 0));
      setCurrentMessage(message || '');

      setAgents((prevAgents) => {
        const currentIndex = prevAgents.findIndex((a) => a.id === currentAgent);
        
        return prevAgents.map((agent, index) => {
          // Update the current agent
          if (agent.id === currentAgent) {
            return {
              ...agent,
              status: status as AgentStatus,
              message: message || '',
            };
          }
          
          // If current agent is completed, mark all previous agents as completed
          if (status === 'completed' && currentIndex !== -1 && index < currentIndex) {
            // Only mark as completed if it's not already in a terminal state
            if (agent.status === 'pending' || agent.status === 'active') {
              return {
                ...agent,
                status: 'completed' as AgentStatus,
              };
            }
          }
          
          // If a new agent becomes active, mark previous active agent as completed
          if (status === 'active' && currentIndex !== -1 && index < currentIndex) {
            if (agent.status === 'active') {
              return {
                ...agent,
                status: 'completed' as AgentStatus,
              };
            }
          }
          
          return agent;
        });
      });
    };

    const handleCompleted = (data: any) => {
      console.log('[Pipeline] Completed event received:', data);
      setIsCompleted(true);
      setCurrentProgress(100);
      setCurrentMessage(data.message || 'Pipeline completed successfully');
      
      // Mark all agents as completed
      setAgents((prevAgents) =>
        prevAgents.map((agent) => ({
          ...agent,
          status: 'completed' as AgentStatus,
        }))
      );
    };

    const handleError = (error: any) => {
      console.error('[Pipeline] Error event received:', error);
      setHasError(true);
      setCurrentMessage(error.message || 'Pipeline execution failed');
      
      // Mark current agent as error
      setAgents((prevAgents) =>
        prevAgents.map((agent) => {
          if (agent.status === 'active') {
            return { ...agent, status: 'error' as AgentStatus };
          }
          return agent;
        })
      );
    };

    // Set up event listeners BEFORE joining the room
    // Use 'on' instead of 'once' to ensure listeners persist
    pipelineSocket.on('connect', handleConnect);
    pipelineSocket.on('disconnect', handleDisconnect);
    pipelineSocket.on('pipeline-status', handleStatusUpdate);
    pipelineSocket.on('pipeline-completed', handleCompleted);
    pipelineSocket.on('pipeline-error', handleError);

    // Join the room after setting up listeners
    if (pipelineSocket.connected) {
      joinMeetingPipeline(meetingId);
    } else {
      // Wait for connection before joining
      const connectHandler = () => {
        joinMeetingPipeline(meetingId);
        pipelineSocket.off('connect', connectHandler);
      };
      pipelineSocket.on('connect', connectHandler);
    }
    
    // Reload initial status when reconnecting to ensure we have the latest state
    const handleReconnect = async () => {
      console.log('[Pipeline] Reconnected, reloading initial status...');
      try {
        const response = await meetingsAPI.getPipelineStatus(meetingId);
        if (response.data.success && response.data.data) {
          const pipelineData = response.data.data;
          
          // Update overall status
          if (pipelineData.status === 'completed') {
            setIsCompleted(true);
            setCurrentProgress(100);
            setCurrentMessage('Pipeline completed successfully');
          } else if (pipelineData.status === 'failed') {
            setHasError(true);
            setCurrentMessage(pipelineData.error || 'Pipeline execution failed');
          } else {
            setCurrentProgress(pipelineData.progress || 0);
            setCurrentMessage(pipelineData.currentAgent ? `Running ${pipelineData.currentAgent}...` : 'Starting...');
          }

          // Update agent statuses from database
          if (pipelineData.agentResults) {
            setAgents((prevAgents) =>
              prevAgents.map((agent) => {
                const agentResult = pipelineData.agentResults[agent.id];
                if (agentResult) {
                  return {
                    ...agent,
                    status: agentResult.status as AgentStatus,
                    message: agentResult.error || (agentResult.status === 'completed' ? 'Completed' : ''),
                  };
                }
                if (pipelineData.status === 'running' && pipelineData.currentAgent === agent.id) {
                  return { ...agent, status: 'active' as AgentStatus };
                }
                return agent;
              })
            );
          }
        }
      } catch (error) {
        console.log('[Pipeline] Failed to reload status on reconnect:', error);
      }
    };
    
    pipelineSocket.on('reconnect', handleReconnect);

    // Cleanup
    return () => {
      if (pipelineSocket) {
        pipelineSocket.off('connect', handleConnect);
        pipelineSocket.off('disconnect', handleDisconnect);
        pipelineSocket.off('pipeline-status', handleStatusUpdate);
        pipelineSocket.off('pipeline-completed', handleCompleted);
        pipelineSocket.off('pipeline-error', handleError);
        pipelineSocket.off('reconnect', handleReconnect);
        leaveMeetingPipeline(meetingId);
      }
    };
  }, [meetingId]);

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'active':
        return <Loader2 className="w-4 h-4 text-primary-main animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'active':
        return 'bg-primary-50 border-primary-200 text-primary-700';
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-500';
    }
  };

  if (isCompleted && !hasError) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">{currentMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{currentMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  // Find the currently active agent
  const activeAgent = agents.find((agent) => agent.status === 'active');
  const hasStarted = agents.some((agent) => agent.status !== 'pending');

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          {hasStarted ? (
            <Loader2 className="w-4 h-4 text-primary-main animate-spin" />
          ) : (
            <Clock className="w-4 h-4 text-gray-400" />
          )}
          Agentic Pipeline
          {!hasStarted && !isCompleted && (
            <span className="text-xs font-normal text-gray-500 ml-2">(Starting...)</span>
          )}
        </h3>
        <span className="text-xs font-medium text-gray-600">{currentProgress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary-main h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, currentProgress))}%` }}
        />
      </div>

      {/* Current Active Agent - Highlighted */}
      {activeAgent && (
        <div className="bg-primary-100 border-2 border-primary-main rounded-lg p-3 animate-pulse">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-primary-main animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary-900">
                Currently Running: {activeAgent.displayName}
              </p>
              {activeAgent.message && (
                <p className="text-xs text-primary-700 mt-1">{activeAgent.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current Status Message */}
      {currentMessage && !activeAgent && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
          <p className="text-xs font-medium text-primary-800">{currentMessage}</p>
        </div>
      )}

      {/* Agent List */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pipeline Agents</p>
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
              agent.status === 'active' ? 'ring-2 ring-primary-main' : ''
            } ${getStatusColor(agent.status)}`}
          >
            <div className="flex-shrink-0">{getStatusIcon(agent.status)}</div>
            <div className="flex-1">
              <p className="text-xs font-medium">{agent.displayName}</p>
              {agent.message && agent.status !== 'active' && (
                <p className="text-xs opacity-75 mt-0.5">{agent.message}</p>
              )}
            </div>
            {agent.status === 'active' && (
              <span className="text-xs font-medium text-primary-main animate-pulse">Running...</span>
            )}
            {agent.status === 'completed' && (
              <span className="text-xs font-medium text-green-600">✓ Done</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

