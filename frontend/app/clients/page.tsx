'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { isAuthenticated, getStoredUser } from '@/lib/auth';
import { clientsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, Briefcase } from 'lucide-react';
import ClientModal from '@/components/clients/ClientModal';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const user = getStoredUser();

  useEffect(() => {
    if (isAuthenticated()) {
      loadClients();
    }
  }, []);

  const loadClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      setClients(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedClient(null);
    setModalOpen(true);
  };

  const handleEdit = (client: any) => {
    setSelectedClient(client);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      await clientsAPI.delete(id);
      toast.success('Client deleted successfully');
      loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete client');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedClient(null);
    loadClients();
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

  const canManage = user?.role === 'admin';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-heading">Clients</h1>
            <p className="text-sm text-text-muted mt-1">Manage client relationships and accounts</p>
          </div>
          {canManage && (
            <button
              onClick={handleCreate}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-primary-main to-primary-hover text-white rounded-xl hover:from-primary-hover hover:to-primary-main/90 transition-all shadow-soft hover:shadow-medium font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Add Client</span>
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
                    Industry
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Account Manager
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Utilization
                  </th>
                  {canManage && (
                    <th className="px-6 py-4 text-right text-xs font-semibold text-text-heading uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-background-primary divide-y divide-border-light">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Briefcase className="w-12 h-12 text-text-light" />
                        <p className="text-text-muted font-medium">No clients found</p>
                        {canManage && (
                          <button
                            onClick={handleCreate}
                            className="text-sm text-primary-main hover:text-primary-hover font-medium"
                          >
                            Add your first client
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client._id} className="hover:bg-background-secondary transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-heading">
                        {client.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.industry ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-main">
                            {client.industry}
                          </span>
                        ) : (
                          <span className="text-sm text-text-light">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                        {client.accountManagerId?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-text-body">
                          {client.projectCount || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-border-default rounded-full h-2 max-w-[60px]">
                            <div 
                              className="h-2 rounded-full bg-primary-main"
                              style={{ width: `${Math.min(100, client.totalUtilization || 0)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-text-body">
                            {Math.round(client.totalUtilization || 0)}%
                          </span>
                        </div>
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-1">
                            <a
                              href={`/clients/${client._id}`}
                              className="p-2 text-primary-main hover:bg-primary-50 rounded-lg transition-all group"
                              title="View"
                            >
                              <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </a>
                            <button
                              onClick={() => handleEdit(client)}
                              className="p-2 text-priority-high-text hover:bg-priority-high-bg rounded-lg transition-all group"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={() => handleDelete(client._id)}
                              className="p-2 text-priority-critical-text hover:bg-priority-critical-bg rounded-lg transition-all group"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
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
        <ClientModal
          client={selectedClient}
          onClose={handleModalClose}
          users={[]} // You can fetch users if needed for account manager selection
        />
      )}
    </Layout>
  );
}
