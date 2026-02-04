/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/api/axiosInstance';
import NewIntegrationDialog, { type IntegrationFormData } from '@/components/NewIntegrationDialog';
import { Plus, Search, Unplug, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as Checkbox from '@radix-ui/react-checkbox';



interface ApiResponse {
  id: number;
  applicationName: string;
  applicationUrl: string;
  secretKey: string;
  createdAt: string;
  updatedAt: string | null;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  offset: number;
}

const ApiPage: React.FC = () => {
  const [isNewIntegrationDialogOpen, setIsNewIntegrationDialogOpen] = React.useState(false);
  const [externalSystems, setExternalSystems] = useState<ApiResponse[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Secret key visibility toggle per row
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  // Copied key feedback per row
  const [copiedKeys, setCopiedKeys] = useState<Set<number>>(new Set());

  // Selection state
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12,
    offset: 0,
  });

  // Initial load
  useEffect(() => {
    loadData();
  }, [pagination.currentPage, pagination.itemsPerPage]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      loadData();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadData = async () => {
    try {
      const response = await api.get("v1/external-systems", {
        params: {
          page: pagination.currentPage,
          limit: pagination.itemsPerPage,
          offset: pagination.offset,
          search: searchQuery.trim() || undefined
        }
      });

      // ── set state from the response ──
      const data = response.data;
      setExternalSystems(data.data || data);
      setPagination(prev => ({
        ...prev,
        totalItems: data.pagination?.totalItems || data.totalItems || 0,
        totalPages: data.pagination?.totalPages || data.totalPages || 1,
      }));
    } catch (error) {
      console.error("Error fetching external systems:", error);
      toast.error('Failed to load external systems. Please try again.');
    }
  };

  // ── selection helpers ──
  const toggleItemSelection = (id: number) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const selectAllOnPage = () => {
    if (selectedItems.length === externalSystems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(externalSystems.map(sys => sys.id));
    }
  };

  const clearSelection = () => setSelectedItems([]);

  // ── secret key helpers ──
  const toggleKeyVisibility = (id: number) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyToClipboard = useCallback(async (id: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeys(prev => new Set(prev).add(id));
      setTimeout(() => {
        setCopiedKeys(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 1500);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, []);

  // ── disconnect (unplug) an integration ──
  const handleDisconnect = async (id: number, name: string) => {
    if (!window.confirm(`Disconnect "${name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`v1/external-systems/${id}`);
      toast.success(`"${name}" disconnected successfully.`);
      setExternalSystems(prev => prev.filter(s => s.id !== id));
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
      setPagination(prev => ({
        ...prev,
        totalItems: prev.totalItems - 1,
      }));
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      toast.error('Failed to disconnect integration. Please try again.');
    }
  };

  // ── bulk delete selected integrations ──
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Disconnect ${selectedItems.length} integration(s)? This cannot be undone.`)) return;
    try {
      await Promise.all(selectedItems.map(id => api.delete(`v1/external-systems/${id}`)));
      toast.success(`${selectedItems.length} integration(s) disconnected.`);
      setExternalSystems(prev => prev.filter(s => !selectedItems.includes(s.id)));
      setPagination(prev => ({
        ...prev,
        totalItems: prev.totalItems - selectedItems.length,
      }));
      clearSelection();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to disconnect some integrations.');
    }
  };

  const openNewIntegrationDialog = () => {
    setIsNewIntegrationDialogOpen(prev => !prev);
  };

  // Implement the actual save function
  async function handleSaveIntegration(data: IntegrationFormData): Promise<void> {
    try {
      console.log('Saving integration data:', data);

      const response = await api.post("v1/external-systems", {
        applicationName: data.applicationName,
        applicationUrl: data.applicationUrl,
      });

      // Append new integration to the list immediately
      const newSystem: ApiResponse = response.data;
      setExternalSystems(prev => [newSystem, ...prev]);
      setPagination(prev => ({ ...prev, totalItems: prev.totalItems + 1 }));

      toast.success(`Integration "${data.applicationName}" saved successfully!`);
      setIsNewIntegrationDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save external system. Please try again.');
      throw error;
    }
  }

  // ── date helpers ──
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const totalPages = pagination.totalPages;

  return (
    <>
      <div className="relative min-h-screen bg-[#E7F2EF] p-8">
        <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
            style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)` }}
        />
        <div className="absolute inset-0 bg-black/30"></div>

        <div className="relative max-w-[90rem] mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#A1C2BD] rounded-lg">
                  <Unplug className="w-6 h-6 text-[#19183B]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#19183B]">API Connect</h1>
                  <p className="text-[#708993]">Connect to external Information System and manage API integrations.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={openNewIntegrationDialog}
                  className="flex items-center gap-2 bg-[#19183B] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#708993] transition-colors shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add new Integration
                </button>
              </div>
            </div>
          </div>

          {/* Selection Bar */}
          {selectedItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-[#A1C2BD]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">
                      {selectedItems.length} selected
                    </span>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Deselect all
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkDelete}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Disconnect selected"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 relative min-w-[300px]">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#708993]" />
                <input
                  type="text"
                  placeholder="Search Information Systems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-[#19183B]">Show:</label>
                <select
                  value={pagination.itemsPerPage}
                  onChange={(e) => {
                    const newLimit = Number(e.target.value);
                    setPagination(prev => ({
                      ...prev,
                      currentPage: 1,
                      itemsPerPage: newLimit,
                    }));
                  }}
                  className="px-4 py-3 border-2 border-[#A1C2BD] rounded-xl bg-white focus:ring-2 focus:ring-[#708993] outline-none transition-all cursor-pointer"
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                  <option value={96}>96</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden">
            <div className="p-6">
              {externalSystems.length === 0 ? (
                /* ── empty state ── */
                <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                  <Unplug className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg mb-2">
                    {searchQuery ? 'No integrations found' : 'No integrations yet'}
                  </p>
                  <p className="text-sm">
                    {searchQuery
                      ? 'Try adjusting your search'
                      : 'Click "Add new Integration" to connect an external system'}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden border border-gray-200 rounded-xl">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {/* select-all checkbox */}
                        <th className="w-12 px-6 py-3 text-left">
                          <Checkbox.Root
                            checked={selectedItems.length === externalSystems.length && externalSystems.length > 0}
                            onCheckedChange={selectAllOnPage}
                            className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                          >
                            <Checkbox.Indicator>
                              <Check className="w-3 h-3 text-white" />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application URL</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Secret Key</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated At</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {externalSystems.map((system) => (
                        <tr
                          key={system.id}
                          className={`hover:bg-gray-50 transition-colors ${selectedItems.includes(system.id) ? 'bg-blue-50' : ''}`}
                        >
                          {/* checkbox */}
                          <td className="px-6 py-4">
                            <Checkbox.Root
                              checked={selectedItems.includes(system.id)}
                              onCheckedChange={() => toggleItemSelection(system.id)}
                              className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                            >
                              <Checkbox.Indicator>
                                <Check className="w-3 h-3 text-white" />
                              </Checkbox.Indicator>
                            </Checkbox.Root>
                          </td>

                          {/* name */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-[#E7F2EF] flex items-center justify-center">
                                <Unplug className="w-4 h-4 text-[#19183B]" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{system.applicationName}</div>
                              </div>
                            </div>
                          </td>

                          {/* url */}
                          <td className="px-6 py-4">
                            <a
                              href={system.applicationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                            >
                              {system.applicationUrl}
                            </a>
                          </td>

                          {/* secret key – masked with show/copy */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700 font-mono break-all">
                                {visibleKeys.has(system.id)
                                  ? system.secretKey
                                  : '••••••••••••'}
                              </span>
                              <button
                                onClick={() => toggleKeyVisibility(system.id)}
                                className="p-1 text-gray-400 hover:text-[#19183B] transition-colors shrink-0"
                                title={visibleKeys.has(system.id) ? 'Hide key' : 'Show key'}
                              >
                                {visibleKeys.has(system.id)
                                  ? <EyeOff className="w-4 h-4" />
                                  : <Eye className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(system.id, system.secretKey)}
                                className="p-1 text-gray-400 hover:text-[#19183B] transition-colors shrink-0"
                                title="Copy key"
                              >
                                {copiedKeys.has(system.id)
                                  ? <Check className="w-4 h-4 text-green-600" />
                                  : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>

                          {/* created at */}
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700">{formatRelativeDate(system.createdAt)}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(system.createdAt).toLocaleDateString()}
                            </div>
                          </td>

                          {/* updated at */}
                          <td className="px-6 py-4">
                            {system.updatedAt ? (
                              <>
                                <div className="text-sm text-gray-700">{formatRelativeDate(system.updatedAt)}</div>
                                <div className="text-xs text-gray-400">
                                  {new Date(system.updatedAt).toLocaleDateString()}
                                </div>
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>

                          {/* actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleDisconnect(system.id, system.applicationName)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Disconnect integration"
                              >
                                <Unplug className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-[#A1C2BD] p-6 bg-[#E7F2EF]/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#708993]">
                    Page {pagination.currentPage} of {totalPages} • {pagination.totalItems} items
                  </p>
                  <div className="flex items-center gap-2">
                    {/* Previous */}
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                      disabled={pagination.currentPage === 1}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      Previous
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = pagination.currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPagination(prev => ({ ...prev, currentPage: pageNum }))}
                            className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                              pagination.currentPage === pageNum
                                ? 'bg-[#19183B] text-white'
                                : 'border border-[#A1C2BD] text-[#19183B] hover:bg-[#A1C2BD] hover:text-white'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next */}
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: Math.min(totalPages, prev.currentPage + 1) }))}
                      disabled={pagination.currentPage === totalPages}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50"
                    >
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Integration Dialog */}
      {isNewIntegrationDialogOpen && (
        <NewIntegrationDialog
          open={isNewIntegrationDialogOpen}
          onOpenChange={setIsNewIntegrationDialogOpen}
          onSave={handleSaveIntegration}
        />
      )}
    </>
  );
};

export default ApiPage;