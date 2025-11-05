'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { isAuthenticated, getStoredUser } from '@/lib/auth';
import { projectsAPI, clientsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, FolderKanban } from 'lucide-react';
import ProjectModal from '@/components/projects/ProjectModal';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const user = getStoredUser();

  useEffect(() => {
    if (isAuthenticated()) {
      loadProjects();
      loadClients();
    }
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      setClients(response.data.data);
    } catch (error) {
      console.error('Failed to load clients');
    }
  };

  const handleCreate = () => {
    setSelectedProject(null);
    setModalOpen(true);
  };

  const handleEdit = (project: any) => {
    setSelectedProject(project);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await projectsAPI.delete(id);
      toast.success('Project deleted successfully');
      loadProjects();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete project');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedProject(null);
    loadProjects();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-main"></div>
        </div>
      </Layout>
    );
  }

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-heading">Projects</h1>
            <p className="text-sm text-text-muted mt-1">Manage and track all projects</p>
          </div>
          {canManage && (
            <button
              onClick={handleCreate}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-primary-main to-primary-hover text-white rounded-xl hover:from-primary-hover hover:to-primary-main/90 transition-all shadow-soft hover:shadow-medium font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Add Project</span>
            </button>
          )}
        </div>

        <div className="bg-background-primary rounded-xl shadow-soft border border-border-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light">
              <thead className="bg-gradient-to-r from-primary-50 to-transparent">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Developers
                  </th>
                  {canManage && (
                    <th className="px-6 py-4 text-right text-xs font-semibold text-text-heading uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-background-primary divide-y divide-border-light">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 7 : 6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <FolderKanban className="w-12 h-12 text-text-light" />
                        <p className="text-text-muted font-medium">No projects found</p>
                        {canManage && (
                          <button
                            onClick={handleCreate}
                            className="text-sm text-primary-main hover:text-primary-hover font-medium"
                          >
                            Create your first project
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project._id} className="hover:bg-background-secondary transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-text-heading">{project.name}</div>
                        {project.status && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                            project.status === 'active' ? 'bg-system-active-bg text-system-active-text' :
                            project.status === 'completed' ? 'bg-status-operational-bg text-status-operational-text' :
                            project.status === 'on-hold' ? 'bg-status-hold-bg text-status-hold-text' :
                            'bg-priority-critical-bg text-priority-critical-text'
                          }`}>
                            {project.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                        {project.clientId?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                        {project.managerId?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                        <div>{new Date(project.startDate).toLocaleDateString()}</div>
                        <div className="text-xs text-text-light">to {new Date(project.endDate).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-border-default rounded-full h-2 max-w-[60px]">
                            <div 
                              className={`h-2 rounded-full ${
                                (project.totalUtilization || 0) > 100 ? 'bg-priority-critical-text' :
                                (project.totalUtilization || 0) > 80 ? 'bg-priority-high-text' :
                                'bg-system-active-text'
                              }`}
                              style={{ width: `${Math.min(100, project.totalUtilization || 0)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-text-body">
                            {Math.round(project.totalUtilization || 0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-body">
                        {project.developerCount || 0}
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-1">
                            <a
                              href={`/projects/${project._id}`}
                              className="p-2 text-primary-main hover:bg-primary-50 rounded-lg transition-all group"
                              title="View"
                            >
                              <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </a>
                            <button
                              onClick={() => handleEdit(project)}
                              className="p-2 text-priority-high-text hover:bg-priority-high-bg rounded-lg transition-all group"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => handleDelete(project._id)}
                                className="p-2 text-priority-critical-text hover:bg-priority-critical-bg rounded-lg transition-all group"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <ProjectModal
          project={selectedProject}
          onClose={handleModalClose}
          clients={clients}
        />
      )}
    </Layout>
  );
}
