import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, ChevronLeft, ChevronRight, Eye, Download, X,
  ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, ZoomIn, ZoomOut,
  User, Users, Check, File, MoreVertical, Share2, Trash2, HardDrive,
  PenTool, Lock, Unlock,
  Signature,
  Pen,
  FilePen,
  Trash,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  GripVertical
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '@/api/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '@/auth/useAuth';
import UserPdfSigner from '@/user/UserPdfSigner';
import { useNavigate } from 'react-router-dom';
import { useDocWebSocket } from '@/hooks/useDocWebSocket';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

interface PDFDocument {
  comment: string;
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  status: string;
  uploadedAt: string;
  ownerDetails: {
    id: string;
    username: string;
    email: string;
  };
  sharedToUsers: Array<{ 
    id: string; 
    username: string; 
    email: string;
    permission?: 'view' | 'view_and_sign';
  }>;
  office?: string;
  downloadable?: boolean;
  permission?: 'view' | 'view_and_sign';
  availableForSigning?: boolean;
  availableForViewing?: boolean;
}

interface UserType {
  id: string;
  username: string;
  email: string;
  roles?: string[] | Array<{ id: number; name: string }>;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  offset: number;
}

interface SignerStep {
  step: number;
  userId: string;
  user?: UserType;
}

// Sortable item component for drag and drop
interface SortableItemProps {
  id: string;
  step: SignerStep;
  index: number;
  moveSignerUp: (index: number) => void;
  moveSignerDown: (index: number) => void;
  totalItems: number;
}

const SortableItem: React.FC<SortableItemProps> = ({ 
  id, 
  step, 
  index, 
  moveSignerUp, 
  moveSignerDown, 
  totalItems 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-white rounded-lg border transition-all ${
        isDragging
          ? 'border-purple-400 shadow-lg z-50'
          : 'border-gray-200 hover:border-purple-300'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-purple-600"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full shrink-0">
        <span className="text-sm font-bold text-purple-700">{step.step}</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {step.user?.username || 'Unknown User'}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {step.user?.email || ''}
        </p>
      </div>
      
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => moveSignerUp(index)}
          disabled={index === 0}
          className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Move up"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => moveSignerDown(index)}
          disabled={index === totalItems - 1}
          className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Move down"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const Shared: React.FC = () => {

  const navigate = useNavigate();

  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const { user } = useAuth();

  // PDF Viewer state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<PDFDocument | null>(null);

  // Unshare modal state
  const [unshareDialogOpen, setUnshareDialogOpen] = useState(false);
  const [selectedDocumentForUnshare, setSelectedDocumentForUnshare] = useState<PDFDocument | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isUnsharing, setIsUnsharing] = useState(false);
  const [unshareSearchQuery, setUnshareSearchQuery] = useState('');

  // Share modal state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDocumentForShare, setSelectedDocumentForShare] = useState<PDFDocument | null>(null);
  const [selectedUsersForShare, setSelectedUsersForShare] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState('');
  const [isShareDownloadable, setIsShareDownloadable] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'view_and_sign'>('view');
  const [signerSteps, setSignerSteps] = useState<SignerStep[]>([]);

  // Filtered users state
  const [filteredShareUsers, setFilteredShareUsers] = useState<UserType[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserType[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);


  const [signDocument, setSignDocument] = useState<PDFDocument | null>(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12,
    offset: 0,
  });

  // Selection state
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadDocuments();
  }, []);

  // Filter users based on search query for share dialog
  useEffect(() => {
    if (shareSearchQuery.trim() === '') {
      setFilteredShareUsers(availableUsers);
    } else {
      const query = shareSearchQuery.toLowerCase();
      const filtered = availableUsers.filter(user => {
        const usernameMatch = user.username.toLowerCase().includes(query);
        const emailMatch = user.email.toLowerCase().includes(query);

        let roleMatch = false;
        if (user.roles && Array.isArray(user.roles)) {
          roleMatch = user.roles.some(role => {
            if (typeof role === 'string') {
              return role.toLowerCase().includes(query);
            } else if (role && typeof role === 'object' && 'name' in role) {
              return role.name.toLowerCase().includes(query);
            }
            return false;
          });
        }

        return usernameMatch || emailMatch || roleMatch;
      });

      setFilteredShareUsers(filtered);
    }
  }, [shareSearchQuery, availableUsers]);

  // Update signer steps when users are selected/deselected
  useEffect(() => {
    if (sharePermission === 'view_and_sign') {
      // Remove users that are no longer selected
      const updatedSteps = signerSteps.filter(step => 
        selectedUsersForShare.includes(step.userId)
      );

      // Find new users that aren't in signerSteps
      const existingUserIds = updatedSteps.map(step => step.userId);
      const newUserIds = selectedUsersForShare.filter(
        userId => !existingUserIds.includes(userId)
      );
      
      // Add new users with proper user data
      newUserIds.forEach((userId) => {
        const userData = availableUsers.find(u => u.id === userId);
        updatedSteps.push({
          step: 0, // Temporary, will be renumbered
          userId,
          user: userData
        });
      });

      // Re-number all steps sequentially to ensure uniqueness
      const finalSteps = updatedSteps.map((step, index) => ({
        ...step,
        step: index + 1
      }));

      // Only update if there's actually a change
      if (JSON.stringify(finalSteps) !== JSON.stringify(signerSteps)) {
        setSignerSteps(finalSteps);
      }
    } else {
      // Clear steps when not in view_and_sign mode
      if (signerSteps.length > 0) {
        setSignerSteps([]);
      }
    }
  }, [selectedUsersForShare, sharePermission, availableUsers]);

  const loadDocuments = async () => {
    try {
      if (!user?.id) {
        toast.error('Please log in first');
        return;
      }

      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        offset: pagination.offset,
        user_id: user?.id,
        user_roles: user?.roles,
      };

      const response = await api.get("v2/documents", { params })
      const data = response.data
      setDocuments(data.data)
      setPagination(prev => ({
        ...prev,
        totalItems: data.pagination.totalItems ?? 0,
        totalPages: data.pagination.totalPages ?? 1,
      }))

    } catch (error) {
      toast.error(`Error fetching shared documents: ${error}`)
    }
  };

  // Filter logic
  // Filter and sort logic
  const filteredDocuments = documents
    .filter((doc) => {
      const matchesSearch =
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.comment && doc.comment.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesOffice = selectedOffice === 'All' || doc.office === selectedOffice;
      return matchesSearch && matchesOffice;
    })
    .sort((a, b) => {
      // Convert dates to timestamps for comparison
      const dateA = new Date(a.uploadedAt).getTime();
      const dateB = new Date(b.uploadedAt).getTime();
      // Sort by date descending (latest first)
      return dateB - dateA;
    });

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedItems([]);
  }, [searchQuery, selectedOffice]);

  // Extract unique offices
  const offices = Array.from(new Set(documents.map((d) => d.office).filter(Boolean)));

  const openUnshareDialog = (doc: PDFDocument) => {
    setSelectedDocumentForUnshare(doc);
    setSelectedUsers(doc.sharedToUsers.map(user => user.id));
    setUnshareSearchQuery('');
    setUnshareDialogOpen(true);
  };

  const openShareDialog = async (doc: PDFDocument) => {
    setSelectedDocumentForShare(doc);
    setSelectedUsersForShare([]);
    setShareMessage('');
    setSharePermission('view');
    setIsShareDownloadable(false);
    setShareSearchQuery('');
    setSignerSteps([]);
    
    await loadAvailableUsersForSharing(doc);
    setShareDialogOpen(true);
  };

  const openSignDialog = (doc: PDFDocument) => {
    // Navigate to the signing page with document ID
    /*navigate(`/documents/my-documents/sign/${doc.id}`, {
      state: { document: doc }
    });*/
    
    handleBlockOthersForSigning(doc)

    setSignDocument(doc);
      setSignDialogOpen(true);



   }

  const loadAvailableUsersForSharing = async (doc: PDFDocument) => {
    setIsLoadingUsers(true);
    try {
      const response = await api.get("v1/users/search", {
        params: {
          query: '',
          excludeCurrent: true,
          currentUserId: user?.id,
          documentId: doc.id
        }
      });

      let allUsers: UserType[] = [];

      if (Array.isArray(response.data)) {
        allUsers = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        allUsers = response.data.data;
      } else if (response.data.users && Array.isArray(response.data.users)) {
        allUsers = response.data.users;
      } else {
        console.error('Unexpected API response structure:', response.data);
        toast.error('Unexpected response format from server');
        return;
      }

      const transformedUsers = allUsers.map(user => ({
        ...user,
        roles: user.roles?.map((role: any) => role.name || role) || []
      }));

      setAvailableUsers(transformedUsers);
      setFilteredShareUsers(transformedUsers);
    } catch (error) {
      toast.error('Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Filter shared users for unshare dialog
  const filteredSharedUsers = selectedDocumentForUnshare?.sharedToUsers.filter(user =>
    user.username.toLowerCase().includes(unshareSearchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(unshareSearchQuery.toLowerCase())
  ) || [];

  const handleShare = async () => {
    if (!selectedDocumentForShare || selectedUsersForShare.length === 0) return;

    // Build the steps array for the payload
    const steps = sharePermission === 'view_and_sign' 
      ? signerSteps.map(step => ({
          step: step.step,
          user: {
            id: step.userId,
            username: step.user?.username || '',
            email: step.user?.email || ''
          }
        }))
      : [];

    setIsSharing(true);
    try {
      await api.post('v2/documents/share', {
        document_id: selectedDocumentForShare.id,
        user_ids: selectedUsersForShare,
        message: shareMessage,
        downloadable: isShareDownloadable,
        permission: sharePermission,
        steps: steps
      });

      toast.success(`Document shared with ${selectedUsersForShare.length} user(s)`);

      // Update the documents state
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === selectedDocumentForShare.id
            ? {
              ...doc,
              sharedToUsers: [
                ...doc.sharedToUsers,
                ...availableUsers
                  .filter(u => selectedUsersForShare.includes(u.id))
                  .map(u => ({
                    id: u.id,
                    username: u.username,
                    email: u.email
                  }))
              ]
            }
            : doc
        )
      );
      
      // Close the modal and reset state
      setShareDialogOpen(false);
      setSelectedUsersForShare([]);
      setShareMessage('');
      setSharePermission('view');
      setIsShareDownloadable(false);
      setShareSearchQuery('');
      setSignerSteps([]);
      
    } catch (error) {
      console.error(error);
      toast.error('Failed to share document.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleUnshare = async () => {
    if (!selectedDocumentForUnshare || selectedUsers.length === 0) return;

    setIsUnsharing(true);
    try {
      await api.patch(`v1/documents/${selectedDocumentForUnshare.id}/unshare`, {
        userIds: selectedUsers
      });

      toast.success(`Successfully unshared from ${selectedUsers.length} user(s)`);
      setUnshareDialogOpen(false);
      setSelectedItems([]);
      setUnshareSearchQuery('');
      loadDocuments();
    } catch (error) {
      toast.error(`Error unsharing document: ${error}`);
    } finally {
      setIsUnsharing(false);
    }
  };

  const toggleSelectAll = () => {
    if (!selectedDocumentForUnshare) return;

    if (selectedUsers.length === selectedDocumentForUnshare.sharedToUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(selectedDocumentForUnshare.sharedToUsers.map(user => user.id));
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleUserForShareSelection = (userId: string) => {
    setSelectedUsersForShare(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsersForShare = () => {
    if (selectedUsersForShare.length === filteredShareUsers.length) {
      setSelectedUsersForShare([]);
    } else {
      setSelectedUsersForShare(filteredShareUsers.map(user => user.id));
    }
  };

  // Signer hierarchy functions
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = signerSteps.findIndex((step) => step.userId === active.id);
    const newIndex = signerSteps.findIndex((step) => step.userId === over.id);

    const reorderedSteps = arrayMove(signerSteps, oldIndex, newIndex).map((step, index) => ({
      ...step,
      step: index + 1,
    }));

    setSignerSteps(reorderedSteps);
  };

  const moveSignerUp = (index: number) => {
    if (index === 0) return;
    
    const newSteps = [...signerSteps];
    const temp = newSteps[index - 1];
    newSteps[index - 1] = newSteps[index];
    newSteps[index] = temp;
    
    // Re-number steps sequentially
    const reorderedSteps = newSteps.map((step, idx) => ({
      ...step,
      step: idx + 1
    }));
    
    setSignerSteps(reorderedSteps);
  };

  const moveSignerDown = (index: number) => {
    if (index === signerSteps.length - 1) return;
    
    const newSteps = [...signerSteps];
    const temp = newSteps[index + 1];
    newSteps[index + 1] = newSteps[index];
    newSteps[index] = temp;
    
    // Re-number steps sequentially
    const reorderedSteps = newSteps.map((step, idx) => ({
      ...step,
      step: idx + 1
    }));
    
    setSignerSteps(reorderedSteps);
  };

  const handleView = async (doc: PDFDocument) => {
    setSelectedDocument(doc);
    try {
      setIsPdfLoading(true);
      const response = await api.get("v1/documents/view/" + doc.filePath, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      setPdfUrl(url);
      setPageNumber(1);
      setScale(1.0);
      setPdfViewerOpen(true);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF document');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleDownload = async (doc: PDFDocument) => {
    if (doc.downloadable === false && doc.ownerDetails.id !== user?.id) {
      toast.error('Download is disabled for this document');
      return;
    }

    try {
      const response = await api.get(`v1/documents/download/${doc.id}`, { responseType: 'blob' });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      link.click();

      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded: ${doc.fileName}`);
    } catch (error: any) {
      toast.error(`Download failed: ${doc.fileName}`);
    }
  };

  // PDF document event handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const goToPreviousPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  const closePdfViewer = () => {
    setPdfViewerOpen(false);
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setSelectedDocument(null);
  };

  // Format file size
  const formatFileSize = (fileSize: string) => {
    const bytes = Number(fileSize);
    if (isNaN(bytes) || bytes < 0) return "—";
    if (bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
  };

  // Format date relative
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

  // Get status badge
  const getStatusBadge = (doc: PDFDocument) => {
    switch (doc.status) {
      case 'pending_signature':
        return (
          <span className="px-2 py-1 text-xs text-center font-medium text-amber-600 bg-amber-50 rounded flex items-center gap-1">
            Awaiting signature
          </span>
        );
      case 'SIGNED':
        return (
          <div className="flex flex-col gap-1">
            <span className="px-2 py-1 text-xs text-center font-medium text-green-600 bg-blue-50 rounded">
              Signed
            </span>
          </div>
        );
      case 'UPLOADED':
        return (
          <div className="flex flex-col gap-1">
            <span className="px-2 py-1 text-xs text-center font-medium text-purple-600 bg-blue-50 rounded">
              Uploaded
              {doc.ownerDetails.id !== user?.id  && (doc.ownerDetails.username
                ? ` by ${doc.ownerDetails.username}` : '')}
              {doc.permission === 'view_and_sign' && (
                ' for signing'
              )}
            </span>
          </div>
        );
      case 'SHARED':
        return (
          <div className="flex flex-col gap-1">
            <span className="px-2 py-1 text-xs text-center font-medium text-blue-600 bg-blue-50 rounded">
              Shared
              {doc.ownerDetails.id !== user?.id  && (doc.ownerDetails.username
                ? ` by ${doc.ownerDetails.username}` : '')}
              {doc.permission === 'view_and_sign' && (
                ' for signing'
              )}
            </span>
          </div>
        );
      case 'SIGNED_AND_SHARED':
        return (
          <div className="flex flex-col gap-1">
            <span className="px-2 py-1 text-xs text-center font-medium text-cyan-600 bg-blue-50 rounded">
              Signed & Shared
              {doc.ownerDetails.id !== user?.id  && (doc.ownerDetails.username
                ? ` by ${doc.ownerDetails.username}` : '')}
            </span>
          </div>
        );
      default:
       return (
        <div className="flex flex-col gap-1">
          {doc.permission && (
            <span
              className={`px-2 py-1 text-xs text-center font-medium rounded
                ${
                  doc.permission === 'view'
                    ? 'text-green-600 bg-green-50 text-center'
                    : 'text-purple-600 bg-purple-50 text-center'
                }
              `}
            >
              {doc.permission === 'view' ? 'View only' : 'View & Sign'}
            </span>
          )}
        </div>
      );
    }
  };

  // Toggle item selection
  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  // Select all items on current page
  const selectAllOnPage = () => {
    if (selectedItems.length === paginatedDocuments.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(paginatedDocuments.map(doc => doc.id));
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedItems([]);
  };



  // =============================WEBSOCKET CODE=============================
  const handleDocUpdate = useCallback((updatedDoc: PDFDocument) => {
    console.log('=================================================');
    console.log('🔄 WebSocket handleDocUpdate called');
    console.log('📦 Received update for document:', updatedDoc.id);
    console.log('📝 File name:', updatedDoc.fileName);
    console.log('🔓 Available for signing:', updatedDoc.availableForSigning);
    console.log('📊 Status:', updatedDoc.status);
    console.log('👤 Current user:', user?.id);
    console.log('=================================================');
    
    setDocuments(prevDocs => {
      // Find the document that needs updating
      const docIndex = prevDocs.findIndex(doc => doc.id === updatedDoc.id);
      
      if (docIndex === -1) {
        console.log(`⚠️ Document ${updatedDoc.id} not found in current list`);
        console.log('📋 Current document IDs:', prevDocs.map(d => d.id));
        return prevDocs;
      }

      // Create a new array to ensure React detects the change
      const newDocs = prevDocs.map((doc, idx) => {
        if (idx === docIndex) {
          // Merge the updated document, ensuring critical fields are updated
          const merged = {
            ...doc,
            ...updatedDoc,
            // Explicitly set these fields to ensure they update
            availableForSigning: updatedDoc.availableForSigning ?? doc.availableForSigning,
            availableForViewing: updatedDoc.availableForViewing ?? doc.availableForViewing,
            status: updatedDoc.status ?? doc.status,
          };
          
          console.log('✅ Document merged successfully');
          console.log('🔍 Final merged document:', {
            id: merged.id,
            fileName: merged.fileName,
            availableForSigning: merged.availableForSigning,
            status: merged.status
          });
          
          return merged;
        }
        return doc;
      });
      
      //console.log('✅ State update complete - React should re-render now');
      return newDocs;
    });
  }, [user?.id]);

  // Initialize WebSocket - wrapped in useMemo to prevent recreating the callback
  useDocWebSocket(handleDocUpdate);

  const handleBlockOthersForSigning = async (doc: PDFDocument) => {
    try {
      const params = {
        documentId: doc.id,
        userId : user?.id
      }

      await api.post('v1/documents/locked-in', params);
      // The websocket will handle the UI update for all users
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error:unknown) {
      toast.error('Failed to lock document for signing.');
    }
  }


  const handleReleaseDocumentLock = async (doc: PDFDocument) => {
    try {
      const params = {
        documentId: doc.id,
        userId: user?.id
      }
      // Then make the API call
      await api.post('v1/documents/locked-out', params);
      // The websocket will broadcast the update to other users
    } catch (error: unknown) {
      console.error('❌ Failed to release document lock:', error);
      
      // Revert the optimistic update on error
      setDocuments(prevDocs => 
        prevDocs.map(document => 
          document.id === doc.id 
            ? { ...document, availableForSigning: false }
            : document
        )
      );
      
      toast.error('Failed to release document lock.');
    }
  }

  // ========================================================================

  return (
    <>
      <div className="relative min-h-screen bg-[#E7F2EF] p-8">
        {/* Background */}
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
                  <File className="w-6 h-6 text-[#19183B]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#19183B]">My Documents</h1>
                  <p className="text-[#708993]">Files you have signed, shared with others and files shared with you</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {filteredDocuments.length} items
                </span>
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
                  <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg">
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
                  placeholder="Search document by filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                />
              </div>

              {/*<div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-[#19183B]">Office:</label>
                <select
                  value={selectedOffice}
                  onChange={(e) => setSelectedOffice(e.target.value)}
                  className="px-4 py-3 border-2 border-[#A1C2BD] rounded-xl bg-white focus:ring-2 focus:ring-[#708993] outline-none transition-all cursor-pointer"
                >
                  <option value="All">All offices</option>
                  {offices.map((office) => (
                    <option key={office} value={office}>
                      {office}
                    </option>
                  ))}
                </select>
              </div>*/}

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-[#19183B]">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
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

          {/* Documents Area */}
          <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden">
            <div className="p-6">
              {paginatedDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                  <Users className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg mb-2">
                    {searchQuery ? 'No shared files found' : 'No shared files yet'}
                  </p>
                  <p className="text-sm">
                    {searchQuery
                      ? 'Try adjusting your search or filter'
                      : user?.roles?.includes('ROLE_ADMIN')
                        ? 'Share files with others to see them here'
                        : 'When someone shares files with you, they will appear here'}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden border border-gray-200 rounded-xl">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="w-12 px-6 py-3 text-left">
                          <Checkbox.Root
                            checked={selectedItems.length === paginatedDocuments.length && paginatedDocuments.length > 0}
                            onCheckedChange={selectAllOnPage}
                            className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                          >
                            <Checkbox.Indicator>
                              <Check className="w-3 h-3 text-white" />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shared by</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shared with</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File size</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last modified</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedDocuments.map((doc) => (
                        <tr
                          key={doc.id}
                          className={`hover:bg-gray-50 ${selectedItems.includes(doc.id) ? 'bg-blue-50' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <Checkbox.Root
                              checked={selectedItems.includes(doc.id)}
                              onCheckedChange={() => toggleItemSelection(doc.id)}
                              className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                            >
                              <Checkbox.Indicator>
                                <Check className="w-3 h-3 text-white" />
                              </Checkbox.Indicator>
                            </Checkbox.Root>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded flex items-center justify-center ${doc.ownerDetails.id === user?.id ? 'bg-blue-50' : 'bg-red-50'
                                }`}>
                                <FileText className={`w-5 h-5 ${doc.ownerDetails.id === user?.id ? 'text-[#779370]' : 'text-[#19183B]'
                                  }`} />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{doc.fileName}</div>
                                <div className="text-sm text-gray-500">PDF document</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${doc.ownerDetails.id === user?.id ? 'bg-green-100' : 'bg-blue-100'
                                }`}>
                                <User className={`w-3 h-3 ${doc.ownerDetails.id === user?.id ? 'text-green-600' : 'text-blue-600'
                                  }`} />
                              </div>
                              <span className="text-sm text-gray-700">
                                {doc.ownerDetails.id === user?.id ? 'You' : doc.ownerDetails.username}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {doc.sharedToUsers.length > 0 ? (
                                <>
                                  <Users className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-700">{doc.sharedToUsers.length} people</span>
                                </>
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(doc)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {formatFileSize(doc.fileSize)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700">{formatRelativeDate(doc.uploadedAt)}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleView(doc)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownload(doc)}
                                disabled={doc.downloadable === false && doc.ownerDetails.id !== user?.id}
                                className={`p-2 rounded-lg transition-colors ${
                                  doc.downloadable === false && doc.ownerDetails.id !== user?.id
                                    ? 'text-gray-300 cursor-not-allowed opacity-50'
                                    : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                                }`}
                                title={
                                  doc.downloadable === false && doc.ownerDetails.id !== user?.id
                                    ? 'Download disabled by owner' 
                                    : 'Download'
                                }
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              { doc.availableForSigning && (
                                <button
                                  onClick={() => openSignDialog(doc)}
                                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Sign document"
                                >
                                  <PenTool className="w-4 h-4" />
                                </button>
                              )}

                              {doc.ownerDetails.id === user?.id && (
                                <button
                                  onClick={() => openShareDialog(doc)}
                                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Share with others"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                              )}
                              
                              <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Portal>
                                  <DropdownMenu.Content 
                                    align="end"
                                    sideOffset={5}
                                    className="min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-50"
                                  >
                                    {doc.ownerDetails.id === user?.id && (
                                      <>
                                        <DropdownMenu.Item 
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded cursor-pointer outline-none"
                                        onClick={() => openUnshareDialog(doc)}
                                        >
                                        <Share2 className="w-4 h-4" />
                                        Unshare
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item 
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded cursor-pointer outline-none"
                                        onClick={() => openUnshareDialog(doc)}
                                        >
                                        <Trash className="w-4 h-4" />
                                        Delete
                                        </DropdownMenu.Item>
                                      </>
                                    )}
                                    {doc.ownerDetails.id !== user?.id && (
                                      <span className='px-3 py-2 text-'>Option not available</span>
                                    )}
                                  </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                              </DropdownMenu.Root>
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
                    Page {currentPage} of {totalPages} • {filteredDocuments.length} items
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-10 h-10 rounded-lg font-medium ${currentPage === pageNum
                                ? 'bg-[#19183B] text-white'
                                : 'border border-[#A1C2BD] text-[#19183B] hover:bg-[#A1C2BD] hover:text-white'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Viewer Dialog */}
      <Dialog.Root open={pdfViewerOpen} onOpenChange={(open) => {
        if (!open) closePdfViewer();
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col border-2 border-[#A1C2BD] z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#A1C2BD] bg-[#E7F2EF] rounded-t-2xl">
              <Dialog.Title className="flex items-center gap-3 text-xl font-bold text-[#19183B]">
                <FileText className="w-6 h-6" />
                {selectedDocument?.fileName || 'PDF Document'}
              </Dialog.Title>

              <div className="flex items-center gap-3">
                {/* Page Navigation */}
                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-[#A1C2BD]">
                  <button
                    onClick={goToPreviousPage}
                    disabled={pageNumber <= 1}
                    className="p-1 hover:bg-[#E7F2EF] rounded disabled:opacity-50"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium min-w-[80px] text-center">
                    Page {pageNumber} of {numPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className="p-1 hover:bg-[#E7F2EF] rounded disabled:opacity-50"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-lg border border-[#A1C2BD]">
                  <button
                    onClick={zoomOut}
                    disabled={scale <= 0.5}
                    className="p-1 hover:bg-[#E7F2EF] rounded disabled:opacity-50"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium min-w-[50px] text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={zoomIn}
                    disabled={scale >= 3}
                    className="p-1 hover:bg-[#E7F2EF] rounded disabled:opacity-50"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={resetZoom}
                    className="px-2 py-1 text-xs bg-[#A1C2BD] text-white rounded hover:bg-[#708993] transition-colors ml-1"
                  >
                    Reset
                  </button>
                </div>

                <button
                  onClick={closePdfViewer}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {isPdfLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-[#A1C2BD] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-[#708993]">Loading PDF...</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <div className="flex justify-center items-start min-h-full">
                  <div className="bg-white shadow-lg rounded-lg p-4 inline-block">
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={(error) => {
                        console.error('Error loading PDF:', error);
                        toast.error('Failed to load PDF document');
                      }}
                      loading={
                        <div className="flex items-center justify-center py-20">
                          <div className="text-center">
                            <div className="w-8 h-8 border-4 border-[#A1C2BD] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-[#708993]">Loading page...</p>
                          </div>
                        </div>
                      }
                    >
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="shadow-sm"
                      />
                    </Document>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-[#708993]">
                  <p>No PDF document to display</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#A1C2BD] p-4 bg-[#E7F2EF] rounded-b-2xl">
              <div className="flex justify-between items-center">
                <p className="text-sm text-[#708993]">
                  Use the controls above to navigate and zoom the document
                </p>
                {selectedDocument && (
                  selectedDocument.ownerDetails.id === user?.id || selectedDocument.downloadable !== false
                ) && (
                    <button
                      onClick={() => handleDownload(selectedDocument)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#19183B] text-white rounded-lg hover:bg-[#708993] transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}
                {selectedDocument &&
                  selectedDocument.downloadable === false &&
                  selectedDocument.ownerDetails.id !== user?.id && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed opacity-50">
                      <Download className="w-4 h-4" />
                      Download disabled
                    </div>
                  )}

              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Share Dialog */}
      <Dialog.Root open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border-2 border-[#A1C2BD] z-50">
            {/* Header - Fixed */}
            <div className="p-6 border-b border-[#A1C2BD] bg-white rounded-t-2xl shrink-0">
              <div className="flex items-center justify-between">
                <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B]">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Share2 className="w-6 h-6 text-blue-600" />
                  </div>
                  Share Document
                </Dialog.Title>
                <button
                  onClick={() => {
                    setShareDialogOpen(false);
                    setSelectedDocumentForShare(null);
                    setSelectedUsersForShare([]);
                    setShareMessage('');
                    setSharePermission('view');
                    setIsShareDownloadable(false);
                    setShareSearchQuery('');
                    setSignerSteps([]);
                  }}
                  className="p-2 hover:bg-[#E7F2EF] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#708993]" />
                </button>
              </div>
              
              <div className="mt-4">
                <p className="text-[#708993] text-sm">
                  Select users to share "<span className="font-semibold text-[#19183B]">{selectedDocumentForShare?.fileName}</span>" with:
                </p>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mt-2">
                  <p className="text-sm text-blue-800">
                    Selected users will have {sharePermission === 'view' ? 'view-only access' : 'view and sign access'} 
                    {sharePermission === 'view_and_sign' && isShareDownloadable ? ' with download capability' : ''}.
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
                {/* Message input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (optional)
                  </label>
                  <textarea
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    placeholder="Add a message to the recipients..."
                    className="w-full px-3 py-2 text-sm border-2 border-[#A1C2BD] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all min-h-[60px]"
                    rows={2}
                  />
                </div>

                {/* Permission type selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permission Level
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSharePermission('view');
                        setIsShareDownloadable(false);
                        setSignerSteps([]);
                      }}
                      className={`p-3 rounded-lg border transition-all ${
                        sharePermission === 'view'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${
                          sharePermission === 'view' ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Eye className={`w-4 h-4 ${
                            sharePermission === 'view' ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-semibold ${
                            sharePermission === 'view' ? 'text-blue-700' : 'text-gray-700'
                          }`}>
                            View Only
                          </p>
                          <p className="text-xs text-gray-500">
                            View document only
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSharePermission('view_and_sign');
                        setIsShareDownloadable(true);
                      }}
                      className={`p-3 rounded-lg border transition-all ${
                        sharePermission === 'view_and_sign'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${
                          sharePermission === 'view_and_sign' ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          <PenTool className={`w-4 h-4 ${
                            sharePermission === 'view_and_sign' ? 'text-purple-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-semibold ${
                            sharePermission === 'view_and_sign' ? 'text-purple-700' : 'text-gray-700'
                          }`}>
                            View & Sign
                          </p>
                          <p className="text-xs text-gray-500">
                            View, download & sign
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    {sharePermission === 'view' 
                      ? 'Recipients can only view this document. Download is disabled.' 
                      : 'Recipients can view, download, and add electronic signatures.'}
                  </p>
                </div>

                {/* Download permission toggle - Conditionally show based on permission */}
                {sharePermission === 'view_and_sign' && (
                  <div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        {isShareDownloadable ? (
                          <Unlock className="w-4 h-4 text-green-600" />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">Allow downloading</p>
                          <p className="text-xs text-gray-500">
                            {isShareDownloadable 
                              ? 'Recipients can download this document' 
                              : 'Download is disabled for recipients'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsShareDownloadable(!isShareDownloadable)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          isShareDownloadable ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            isShareDownloadable ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* User Selection Section */}
                <div className="border-t pt-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Recipients</h3>
                  
                  {/* Search input */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users by name, email, or role..."
                        value={shareSearchQuery}
                        onChange={(e) => setShareSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      {shareSearchQuery && (
                        <button
                          onClick={() => setShareSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Select All */}
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Checkbox.Root
                        id="select-all-share"
                        checked={selectedUsersForShare.length === filteredShareUsers.length && filteredShareUsers.length > 0}
                        onCheckedChange={selectAllUsersForShare}
                        className="w-4 h-4 bg-white border border-blue-500 rounded flex items-center justify-center data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      >
                        <Checkbox.Indicator>
                          <Check className="w-3 h-3 text-white" />
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                      <label htmlFor="select-all-share" className="text-sm font-medium text-[#19183B] cursor-pointer">
                        Select All ({filteredShareUsers.length} users)
                      </label>
                    </div>
                  </div>

                  {/* Users List */}
                  <div className="max-h-[180px] min-h-[100px] overflow-y-auto border border-[#A1C2BD] rounded-lg mb-1">
                    {isLoadingUsers ? (
                      <div className="p-6 text-center">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Loading available users...</p>
                      </div>
                    ) : filteredShareUsers.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {filteredShareUsers.map((availableUser) => (
                          <div key={availableUser.id} className="flex items-center gap-2 p-3 hover:bg-gray-50">
                            <Checkbox.Root
                              id={`user-share-${availableUser.id}`}
                              checked={selectedUsersForShare.includes(availableUser.id)}
                              onCheckedChange={() => toggleUserForShareSelection(availableUser.id)}
                              className="w-4 h-4 bg-white border border-blue-500 rounded flex items-center justify-center data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            >
                              <Checkbox.Indicator>
                                <Check className="w-3 h-3 text-white" />
                              </Checkbox.Indicator>
                            </Checkbox.Root>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-blue-100 rounded-full">
                                  <User className="w-3 h-3 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[#19183B] truncate">{availableUser.username}</p>
                                  <p className="text-xs text-[#708993] truncate">{availableUser.email}</p>
                                  {availableUser.roles && (
                                    <p className="text-xs text-gray-500 truncate">
                                      {availableUser.roles.join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-[#708993]">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm mb-1">
                          {shareSearchQuery ? 'No users match your search' : 'No available users'}
                        </p>
                        <p className="text-xs">
                          {shareSearchQuery 
                            ? 'Try a different search term' 
                            : 'All users already have access to this document'}
                        </p>
                        {shareSearchQuery && (
                          <button
                            onClick={() => setShareSearchQuery('')}
                            className="mt-2 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Selected count */}
                  <div className="text-xs text-gray-500 text-right mb-1">
                    {selectedUsersForShare.length} of {filteredShareUsers.length} users selected
                  </div>
                </div>

                {/* Signer Hierarchy - Only show when view_and_sign is selected and users are selected */}
                {sharePermission === 'view_and_sign' && signerSteps.length > 0 && (
                  <div className="border-t pt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <ListOrdered className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Signing Order</h3>
                      <span className="text-xs text-gray-500">(Drag to reorder or use arrow buttons)</span>
                    </div>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-xs text-purple-700 mb-3">
                        Define the order in which recipients must sign the document. Each signer will be notified when it's their turn.
                      </p>
                      
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={signerSteps.map(step => step.userId)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {signerSteps.map((step, index) => (
                              <SortableItem
                                key={step.userId}
                                id={step.userId}
                                step={step}
                                index={index}
                                moveSignerUp={moveSignerUp}
                                moveSignerDown={moveSignerDown}
                                totalItems={signerSteps.length}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="shrink-0 p-4 border-t border-[#A1C2BD] bg-white rounded-b-2xl">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShareDialogOpen(false);
                    setSelectedDocumentForShare(null);
                    setSelectedUsersForShare([]);
                    setShareMessage('');
                    setSharePermission('view');
                    setIsShareDownloadable(false);
                    setShareSearchQuery('');
                    setSignerSteps([]);
                  }}
                  className="px-4 py-2 text-sm border border-[#A1C2BD] text-[#19183B] rounded-lg font-medium hover:bg-[#E7F2EF] transition-colors"
                  disabled={isSharing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleShare}
                  disabled={selectedUsersForShare.length === 0 || isSharing}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSharing ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      Share with {selectedUsersForShare.length} user{selectedUsersForShare.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      
      {/* Unshare Dialog */}
      <Dialog.Root open={unshareDialogOpen} onOpenChange={setUnshareDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 border-2 border-[#A1C2BD] z-50">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <Users className="w-6 h-6 text-[#19183B]" />
              </div>
              Unshare Document
            </Dialog.Title>

            <div className="mb-6">
              <p className="text-[#708993] mb-2">
                Select users to unshare "{selectedDocumentForUnshare?.fileName}" from:
              </p>
              <div className="p-4 bg-[#E7F2EF] rounded-lg border border-[#A1C2BD]">
                <p className="text-sm text-[#19183B] font-medium">
                  Document will be removed from selected users' shared folders.
                </p>
              </div>
            </div>

            {/* Search input */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search shared users..."
                  value={unshareSearchQuery}
                  onChange={(e) => setUnshareSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {unshareSearchQuery && (
                  <button
                    onClick={() => setUnshareSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Select All */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <Checkbox.Root
                  id="select-all"
                  checked={!!(selectedDocumentForUnshare && selectedUsers.length === filteredSharedUsers.length && filteredSharedUsers.length > 0)}
                  onCheckedChange={toggleSelectAll}
                  className="w-5 h-5 bg-white border-2 border-[#A1C2BD] rounded flex items-center justify-center data-[state=checked]:bg-[#19183B] data-[state=checked]:border-[#19183B]"
                >
                  <Checkbox.Indicator>
                    <Check className="w-4 h-4 text-white" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <label htmlFor="select-all" className="text-sm font-semibold text-[#19183B] cursor-pointer">
                  Select All ({filteredSharedUsers.length} filtered users)
                </label>
              </div>
            </div>

            {/* Users List */}
            <div className="max-h-96 overflow-y-auto mb-6 border border-[#A1C2BD] rounded-lg">
              {filteredSharedUsers.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {filteredSharedUsers.map((sharedUser) => (
                    <div key={sharedUser.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                      <Checkbox.Root
                        id={`user-${sharedUser.id}`}
                        checked={selectedUsers.includes(sharedUser.id)}
                        onCheckedChange={() => toggleUserSelection(sharedUser.id)}
                        className="w-5 h-5 bg-white border-2 border-[#A1C2BD] rounded flex items-center justify-center data-[state=checked]:bg-[#19183B] data-[state=checked]:border-[#19183B]"
                      >
                        <Checkbox.Indicator>
                          <Check className="w-4 h-4 text-white" />
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-[#A1C2BD] rounded-full">
                            <User className="w-3.5 h-3.5 text-[#19183B]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#19183B]">{sharedUser.username}</p>
                            <p className="text-xs text-[#708993] truncate">{sharedUser.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-[#708993]">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="mb-1">
                    {unshareSearchQuery ? 'No shared users match your search' : 'No users to unshare from'}
                  </p>
                  {unshareSearchQuery && (
                    <button
                      onClick={() => setUnshareSearchQuery('')}
                      className="mt-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-[#A1C2BD]">
              <div className="text-sm text-[#708993]">
                {selectedUsers.length} of {filteredSharedUsers.length} users selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setUnshareDialogOpen(false);
                    setSelectedDocumentForUnshare(null);
                    setSelectedUsers([]);
                    setUnshareSearchQuery('');
                  }}
                  className="px-6 py-3 border-2 border-[#A1C2BD] text-[#19183B] rounded-xl font-semibold hover:bg-[#E7F2EF] transition-colors"
                  disabled={isUnsharing}
                >
                  Close
                </button>
                <button
                  onClick={handleUnshare}
                  disabled={selectedUsers.length === 0 || isUnsharing}
                  className="px-6 py-3 bg-[rgb(104,175,110)] text-white rounded-xl font-semibold hover:bg-[rgb(85,155,91)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUnsharing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Unsharing...
                    </>
                  ) : (
                    <>
                      Unshare from {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setUnshareDialogOpen(false);
                setSelectedDocumentForUnshare(null);
                setSelectedUsers([]);
                setUnshareSearchQuery('');
              }}
              className="absolute top-4 right-4 p-2 hover:bg-[#E7F2EF] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#708993]" />
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {signDocument && (
      <Dialog.Root open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed inset-0 bg-white z-50 flex flex-col">
            <Dialog.Title className="sr-only">Sign Document</Dialog.Title>
            <div className="p-4 border-b border-[#A1C2BD] flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[#19183B]">
                Sign Document: {signDocument.fileName}
              </h2>
              <button
                  onClick={() => {
                    if (signDocument) {
                        handleReleaseDocumentLock(signDocument);
                      }
                  setSignDialogOpen(false);
                    setSignDocument(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <UserPdfSigner 
                preloadedDocument={signDocument}
                  onClose={() => {
                  if (signDocument) {
                        handleReleaseDocumentLock(signDocument);
                      }
                  setSignDialogOpen(false);
                  setSignDocument(null);
                  // Don't reload documents here - the optimistic update already handled it
                }}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )}
    </>
  );
};

export default Shared;