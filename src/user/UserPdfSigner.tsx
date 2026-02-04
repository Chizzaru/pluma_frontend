/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import {
  Plus,
  File,
  FileSignature,
  Fullscreen,
  Minimize,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Key,
  Copy,
} from "lucide-react";

import { useSettings } from "@/hooks/useSettings";
import * as Dialog from "@radix-ui/react-dialog";
import api from "@/api/axiosInstance";
import { useAuth } from "@/auth/useAuth";
import toast from "react-hot-toast";
import { GlobalWorkerOptions } from "pdfjs-dist";
import type { RenderTask } from "pdfjs-dist";
import { usePdfLoader } from "@/hooks/usePdfLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Hooks
import { useSignatureManager } from "@/hooks/useSignatureManager";
import { useFileDownload } from "@/hooks/useFileDownload";
import type { Role } from "@/types/auth";
import { useSignaturePreview } from "@/hooks/useSignaturePreview";
import { useAuthImage } from "@/hooks/useAuthImage";


import { useParams, useLocation, useNavigate } from 'react-router-dom';

GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

interface SignatureCardPreviewProps {
  previewUrl: string;
}

interface UserPdfSignerProps {
  preloadedDocument?: PDFDocument;
  onClose?: () => void;
}


const SignatureCardPreview: React.FC<SignatureCardPreviewProps> = ({ previewUrl }) => {
  const isLocal = previewUrl.startsWith("blob:") || previewUrl.startsWith("data:");
  const { imageSrc, loading, error } = useAuthImage({
    url: previewUrl
  })

  const finalSrc = isLocal ? previewUrl : imageSrc;

  if (isLocal) {
    return (
      <img
        src={finalSrc ?? undefined}
        alt="Preview"
        className="max-h-32 object-contain"
      />
    );
  }

  return (
    <>
      {/* Image Section */}
      {loading && <span className="text-sm text-gray-400 animate-pulse">Loading...</span>}
      {error && <span className="text-sm text-red-500">Failed to load</span>}
      {!loading && !error && finalSrc && (
        <img
          src={finalSrc}
          alt="Preview"
          className="max-h-32 object-contain"
        />
      )}
    </>
  )
}

interface PDFDocument {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  status: string;
  uploadedAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  offset: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Signature {
  id: string;
  fileName: string;
  signatureType: 'INITIAL' | 'FULL';
  previewUrl: string;
  createdAt: string;
  fileSize?: number;
  default: boolean;
}

interface CertificateHash {
  certificateHash: string,
  expiresAt: string
}

function UserPdfSigner({ preloadedDocument, onClose }: UserPdfSignerProps) {

    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const documentFromState = location.state?.document;

  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rectRef = useRef<Rect | null>(null);
  
  // State
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number; xOffset?: number; yOffset?: number } | null>(null);
  const [pageImage, setPageImage] = useState<HTMLImageElement | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [certificatePassword, setCertificatePassword] = useState<string>("");
  const [canvasWidth, setCanvasWidth] = useState<number>(0);
  const [canvasHeight, setCanvasHeight] = useState<number>(0);
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);
  const [isHoveringSignature, setIsHoveringSignature] = useState(false);
  const [copyModeDialogOpen, setCopyModeDialogOpen] = useState(false);
  const [copyToPages, setCopyToPages] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [pdfFile, setPdfFile] = useState<File | Blob | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  const [certHash, setCertHash] = useState<CertificateHash | null>(null)

  const { isFullScreen, handleFullScreen } = useSettings();
  const { downloadFile } = useFileDownload();

  const [chooseFileDialogOpen, setChooseFileDialogOpen] = useState(false);
  const [chooseSignatureTypeDialogOpen, setChooseSignatureTypeDialogOpen] = useState(false)
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<PDFDocument | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null)
  const [searchTerm, setSearchTerm] = useState("");

  const { user } = useAuth();
  // Removed unused destructuring from useSignaturePreview
  useSignaturePreview();
  const [isFabOpen, setIsFabOpen] = useState(false);

  const [signatures, setSignatures] = useState<Signature[]>([])

  const [selectedSignatureType, setSelectedSignatureType] = useState<'INITIAL' | 'FULL' | ''>(
    (signatures.find(sig => sig.default)?.signatureType || signatures[0]?.signatureType || '') as 'INITIAL' | 'FULL' | ''
  );

  const [isInitializing, setIsInitializing] = useState(false);
  const hasInitializedRef = useRef(false);

  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    offset: 0,
  });

  // Use pdfFile state to load PDF
  const { pdf, currentPage, setCurrentPage } = usePdfLoader(pdfFile);

  const {
    signatureFile,
    signatureImg,
    signaturePlacements,
    setSignatureImg,
    setSignatureFile,
    setMultiPageMode,
    addSignaturePlacement,
    removeSignaturePlacement,
    updateSignaturePlacement,
    setSignaturePlacements,
  } = useSignatureManager();

  const currentSignaturePosition = signaturePlacements.get(currentPage) || null;

  // Create a function to load the document
  const loadDocumentForSigning = async (doc: PDFDocument) => {
      setIsLoadingPdf(true);
      try {
        setSelectedDocument(doc);
        
        const response = await api.get("v1/documents/view/" + doc.filePath, {
          responseType: 'blob'
        });
        
        const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
        setPdfFile(pdfBlob);
        
        // Reset signature state
        setSignaturePlacements(new Map());
        setSignatureImg(null);
        setCurrentPage(1);
        
        //toast.success(`Loaded document: ${doc.fileName}`);
      } catch (error) {
        console.error('Error loading PDF:', error);
        //toast.error('Failed to load PDF document');
      } finally {
        setIsLoadingPdf(false);
      }
  };



useEffect(() => {
  const initializeDocument = async () => {
    // Prevent multiple initializations
    if (hasInitializedRef.current) return;
    
    setIsInitializing(true);
    hasInitializedRef.current = true;
    
    try {
      console.log('Initializing document with:', { 
        preloadedDocument: !!preloadedDocument, 
        documentFromState: !!documentFromState, 
        id 
      });
      
      // Priority 1: Use preloadedDocument prop (from Dialog modal)
      if (preloadedDocument) {
        console.log('Using preloaded document');
        await loadDocumentForSigning(preloadedDocument);
        setSelectedDocument(preloadedDocument);
      }
      // Priority 2: Use document from route state
      else if (documentFromState) {
        console.log('Using document from route state');
        await loadDocumentForSigning(documentFromState);
      }
      // Priority 3: Fetch by ID from URL parameter
      else if (id) {
        console.log('Fetching document by ID:', id);
        await loadDocumentById(id);
      }
    } catch (error) {
      console.error('Error initializing document:', error);
      // Reset ref to allow retry on error
      hasInitializedRef.current = false;
    } finally {
      setIsInitializing(false);
    }
  };

  initializeDocument();
  
  // Reset when component unmounts
  return () => {
    hasInitializedRef.current = false;
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [id, documentFromState, preloadedDocument]);




  const loadDocumentById = async (documentId: string) => {
    try {
      const response = await api.get(`v1/documents/${documentId}`);
      await loadDocumentForSigning(response.data);
    } catch (error) {
      toast.error('Failed to load document');
      throw error;
    }
  };

  useEffect(() => {
    loadDefaultCert()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  const loadDefaultCert = async () => {
    try {
      const response = await api.get("v1/certificates/default", { params: { user_id: user?.id } })
      const data = response.data
      if (isExpired(data.expiresAt)) {
        toast.error("Expired default certificate")
        return
      }
      setCertHash(data)
    } catch {
      toast.error("No default certificate found")
    }
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Reset function to clear all state after successful submission
  const resetAfterSuccess = () => {
    setPdfFile(null);
    setSelectedDocument(null);
    setSignaturePlacements(new Map());
    setSignatureImg(null);
    setSignatureFile(null);
    setSelectedSignature(null);
    setSelectedSignatureType('');
    rectRef.current = null;
    setCurrentPage(1);
    setCertificatePassword("");
    setError(null);

    // Navigate back if we have onClose or came from navigation
    if (onClose) {
      onClose();
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      
      // Clean up image
      if (signatureImg) {
        URL.revokeObjectURL(signatureImg.src);
      }
      
      // Clean up page image
      if (pageImage) {
        URL.revokeObjectURL(pageImage.src);
      }
    };
  }, [signatureImg, pageImage]);

  // PDF Rendering Effect - FIXED VERSION
  useEffect(() => {
    if (!pdf || !canvasRef.current) {
      return;
    }
    
    let renderTask: RenderTask | null = null;
    let isMounted = true;
    
    const renderPage = async () => {
      try {
        console.log('Rendering page', currentPage);
        
        const page = await pdf.getPage(currentPage);
        const desiredWidth = 800;
        const originalViewport = page.getViewport({ scale: 1 });
        const scale = desiredWidth / originalViewport.width;
        
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || !isMounted) return;
        const context = canvas.getContext("2d");
        if (!context) return;
        
        // Set canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        setCanvasWidth(viewport.width);
        setCanvasHeight(viewport.height);

        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Cancel previous render task if exists
        if (renderTask) {
          try {
            renderTask.cancel();
          } catch (e) {
            // Ignore cancellation errors
          }
        }
        
        // Create new render task
        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        });
        
        await renderTask.promise;
        
        if (!isMounted) return;
        
        // Create image from canvas for later drawing
        const img = new Image();
        img.onload = () => {
          if (isMounted) {
            setPageImage(img);
          }
        };
        img.src = canvas.toDataURL();
        
      } catch (error: any) {
        // Handle render cancellation
        if (error instanceof Error && 
            (error.name === 'RenderingCancelledException' || 
             error.message?.includes('cancel') ||
             error.message?.includes('destroyed'))) {
          console.log('Render cancelled or PDF destroyed');
        } else {
          console.error('Error rendering PDF:', error);
        }
      }
    };
    
    renderPage();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
        renderTask = null;
      }
    };
  }, [pdf, currentPage]);

  // Canvas Update Effect - Draw signature and hover effects on top of PDF
  useEffect(() => {
    if (!canvasRef.current || !pageImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Clear and redraw the PDF
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(pageImage, 0, 0);
    
    // Draw signature if present
    const sigPos = signaturePlacements.get(currentPage);
    if (sigPos && signatureImg) {
      ctx.drawImage(signatureImg, sigPos.x, sigPos.y, sigPos.width, sigPos.height);
      
      // Draw border if hovering
      if (isHoveringSignature) {
        ctx.strokeStyle = "#708993";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(sigPos.x, sigPos.y, sigPos.width, sigPos.height);
        ctx.setLineDash([]);
      }
    }
  }, [pageImage, currentPage, signaturePlacements, signatureImg, isHoveringSignature]);
  
  // Handle mouse leave
  useEffect(() => {
    const handleMouseLeave = () => {
      setIsDraggingSignature(false);
      setIsDrawing(false);
      setIsHoveringSignature(false);
      setStartPos(null);
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mouseleave', handleMouseLeave);
      canvas.addEventListener('touchcancel', handleMouseLeave);
      return () => {
        canvas.removeEventListener('mouseleave', handleMouseLeave);
        canvas.removeEventListener('touchcancel', handleMouseLeave);
      }
    }
  }, []);

  // Get Coordinates Function
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const rectBounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rectBounds.width;
    const scaleY = canvas.height / rectBounds.height;
    
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Standard canvas coordinates (top-left origin)
    const x = (clientX - rectBounds.left) * scaleX;
    const y = (clientY - rectBounds.top) * scaleY;
    
    return { x, y };
  };

  // Handle pointer down
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    const { x, y } = coords;
    const sigPos = signaturePlacements.get(currentPage) || null;

    // Check if clicked/touched inside signature (start dragging)
    if (sigPos && signatureImg &&
      x >= sigPos.x &&
      x <= sigPos.x + sigPos.width &&
      y >= sigPos.y &&
      y <= sigPos.y + sigPos.height
    ) {
      setIsDraggingSignature(true);
      setStartPos({
        x,
        y,
        xOffset: x - sigPos.x,
        yOffset: y - sigPos.y,
      });
      
      // Prevent default for touch events to avoid scrolling
      if ('touches' in e) {
        e.preventDefault();
      }
      return;
    }

    // If there's already a signature on the page, don't start drawing
    if (sigPos && signatureImg) return;

    // Otherwise, start drawing selection
    setStartPos({ x, y });
    setIsDrawing(true);
    
    // Prevent default for touch events
    if ('touches' in e) {
      e.preventDefault();
    }
  };


  // Handle pointer move
  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    const { x, y } = coords;

    // Check if hovering over signature
    const sigPos = signaturePlacements.get(currentPage) || null;
    if (sigPos && signatureImg &&
      x >= sigPos.x &&
      x <= sigPos.x + sigPos.width &&
      y >= sigPos.y &&
      y <= sigPos.y + sigPos.height
    ) {
      setIsHoveringSignature(true);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = isDraggingSignature ? 'grabbing' : 'grab';
      }
    } else {
      setIsHoveringSignature(false);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = isDrawing ? 'crosshair' : 'default';
      }
    }

    drawCanvas({ x, y });
    
    // Prevent default for touch events during drag
    if (('touches' in e) && (isDraggingSignature || isDrawing)) {
      e.preventDefault();
    }
  };


  // Draw Canvas Function
  const drawCanvas = ({ x, y }: { x: number; y: number }) => {
    if (!canvasRef.current || !pageImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    
    // Clear and redraw the PDF
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the PDF image directly (no flip needed)
    ctx.drawImage(pageImage, 0, 0);

    const sigPos = currentSignaturePosition;

    if (isDraggingSignature && sigPos && startPos && signatureImg) {
      // Calculate new position using standard coordinates
      const newX = Math.max(0, Math.min(x - (startPos.xOffset ?? 0), canvas.width - sigPos.width));
      const newY = Math.max(0, Math.min(y - (startPos.yOffset ?? 0), canvas.height - sigPos.height));
      
      const newPos = { ...sigPos, x: newX, y: newY };
      
      // Draw signature in standard canvas coordinates (no flip needed)
      ctx.drawImage(signatureImg, newPos.x, newPos.y, newPos.width, newPos.height);
      
      // Draw selection border
      ctx.strokeStyle = "#708993";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(newPos.x, newPos.y, newPos.width, newPos.height);
      ctx.setLineDash([]);
      
      updateSignaturePlacement(currentPage, newPos);
      return;
    }

    // Draw existing signature (not dragging)
    if (sigPos && signatureImg) {
      ctx.drawImage(signatureImg, sigPos.x, sigPos.y, sigPos.width, sigPos.height);

      // Hover effect
      if (isHoveringSignature) {
        ctx.strokeStyle = "#708993";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(sigPos.x, sigPos.y, sigPos.width, sigPos.height);
        ctx.setLineDash([]);
      }
    }

    // Draw selection rectangle (for creating new signatures)
    if (isDrawing && startPos) {
      const rawW = x - startPos.x;
      const rawH = y - startPos.y;
      const selX = rawW >= 0 ? startPos.x : startPos.x + rawW;
      const selY = rawH >= 0 ? startPos.y : startPos.y + rawH;
      const selW = Math.abs(rawW);
      const selH = Math.abs(rawH);

      ctx.strokeStyle = "#708993";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(selX, selY, selW, selH);
      ctx.setLineDash([]);
      rectRef.current = { x: selX, y: selY, width: selW, height: selH };
    }
  };


  const handlePointerUp = () => {
    if (isDraggingSignature) {
      setIsDraggingSignature(false);
      setStartPos(null);
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      setStartPos(null);
    }
  };

  useEffect(() => {
    if (user?.id && user?.roles) {
      loadSignatures(user.id, user?.roles, null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSignatures = async (userId:string | null, userRoles: Role[], type:any) => {
    try {
      const params = {
        user_id: userId,
        user_roles: userRoles,
        type: null,
        only_defaults: true
      }

      if (type) {
        params.type = type;
      }

      const response = await api.get("v1/signatures", { params })
      setSignatures(response.data);
    } catch (error) {
      console.error("Error loading signatures:", error); 
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    if (pdf) {
      setCurrentPage((prev) => Math.min(pdf.numPages, prev + 1));
    }
  };

  const handleSubmit = async () => {
    // Show password dialog first
    setPasswordDialogOpen(true);
  };

  const handlePasswordConfirm = async () => {
    if (!certificatePassword) {
      toast.error("Please enter your certificate password");
      return;
    }

    if (signaturePlacements.size === 0 || !signatureFile || !pdfFile) {
      toast.error("Please select a certificate and place a signature");
      return;
    }

    setVerifying(true);
    setError(null);

    const formData = new FormData();
    formData.append("documentId", selectedDocument?.id || "")
    formData.append("documentFileName", selectedDocument?.fileName || "");
    formData.append("pdf_document", pdfFile!)
    formData.append("password", certificatePassword); // Use the user-provided password
    formData.append("canvasWidth", canvasWidth.toString());
    formData.append("canvasHeight", canvasHeight.toString());
    formData.append("location", "Unknown Location");

    if (selectedDocument?.fileName) formData.append("original_filename", selectedDocument.fileName)
    if (user?.id) formData.append("user_id", user.id)
    if (selectedSignature?.id) formData.append("signature_image_id", selectedSignature.id)
    if (certHash?.certificateHash) formData.append("certificate_hash", certHash.certificateHash)
    if (selectedSignature?.signatureType && selectedSignature.signatureType.toString() === 'INITIAL') {
      formData.append("isInitial", "true")
    } else {
      formData.append("isInitial", "false")
    }
    
    const placementsArray = Array.from(signaturePlacements.entries()).map(
      ([page, rect]) => ({
        pageNumber: page,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      })
    );

    formData.append("signaturePlacements", JSON.stringify(placementsArray));

    try {
      const response = await api.post("v1/sign-document", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;

      if (data.signedFile) {
        await downloadFile(data.signedFile);

        setPasswordDialogOpen(false);
        setCertificatePassword("");

        toast.success(`Signature submitted successfully! Signed on ${signaturePlacements.size} page(s)`);
        
        // Reset all state after successful submission
        resetAfterSuccess();
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch (err: any) {
      if (err.response) {
        if (err.response.status === 403) {
          setError("Access denied — you do not have permission to sign this document.");
        } else if (err.response.status === 401) {
          setError("Invalid certificate password. Please try again.");
        } else {
          setError(err.response.data?.error || `HTTP error! status: ${err.response.status}`);
        }
      } else if (err.request) {
        setError("No response from server. Please check your connection.");
      } else {
        setError("Error connecting to server: " + err.message);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyToPages = () => {
    if (!currentSignaturePosition || !pdf) return;
    setCopyModeDialogOpen(true);
  };

  const handleCopyConfirm = () => {
    if (!currentSignaturePosition || !pdf) return;

    const pages = parsePagesInput(copyToPages, pdf.numPages);
    
    if (pages.length === 0) {
      toast.error("No valid pages specified");
      return;
    }
    
    const newPlacements = new Map(signaturePlacements);
    let copiedCount = 0;
    
    pages.forEach(pageNum => {
      if (pageNum !== currentPage) {
        newPlacements.set(pageNum, { ...currentSignaturePosition });
        copiedCount++;
      }
    });
    
    if (copiedCount === 0) {
      toast.error("No new pages to copy to (current page excluded)");
      return;
    }
    
    setSignaturePlacements(newPlacements);
    setCopyModeDialogOpen(false);
    setCopyToPages("");
    setMultiPageMode(true);
    toast.success(`Signature copied to ${copiedCount} page(s)`);
  };

  const parsePagesInput = (input: string, totalPages: number): number[] => {
    const pages = new Set<number>();
    const parts = input.split(',').map(s => s.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(s => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
            pages.add(i);
          }
        }
      } else if (part.toLowerCase() === 'all') {
        for (let i = 1; i <= totalPages; i++) {
          pages.add(i);
        }
      } else {
        const pageNum = parseInt(part);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          pages.add(pageNum);
        }
      }
    }
    
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleRemoveSignature = () => {
    removeSignaturePlacement(currentPage);
    if (signaturePlacements.size === 1) {
      setSignatureImg(null);
      setMultiPageMode(false);
    }
  };

  const handleChooseFile = () => {
    loadDocuments();
    setChooseFileDialogOpen((prev) => !prev);
    setIsFabOpen((prev) => !prev);
  };

  const handleChooseSignatureType = () => {
    if (!selectedDocument && !preloadedDocument) {
      toast.error("Please load PDF Document first.");
      return;
    }
    setIsFabOpen(false);
    setChooseSignatureTypeDialogOpen(true);
  };

  const loadDocuments = async (page = 1, search = "") => {
    try {
      const params = {
        page: page,
        limit: pagination.itemsPerPage,
        offset: pagination.offset,
        user_id: user?.id,
        user_roles: '',
        search: search,
      };
      const response = await api.get("v1/documents", { params });
      const data = response.data;
      setDocuments(data.data);

      setPagination((prev) => ({
        ...prev,
        currentPage: page,
        totalItems: data.pagination.totalItems,
        totalPages: data.pagination.totalPages,
        offset: (page - 1) * pagination.itemsPerPage,
      }));
    } catch (error) {
      toast.error(`Error fetching: ${error}`);
    }
  };

  const handleOpenDocument = async () => {
    if (!selectedDocument) return;

    setIsLoadingPdf(true);
    try {
      const response = await api.get("v1/documents/view/" + selectedDocument.filePath, {
        responseType: 'blob'
      });
      
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      
      setPdfFile(pdfBlob);
      setChooseFileDialogOpen(false);
      setSearchTerm("");
      
      setSignaturePlacements(new Map());
      setSignatureImg(null);
      setCurrentPage(1);
      
      //toast.success(`Loaded document: ${selectedDocument.fileName}`);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF document');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocuments(1, searchTerm);
  };

  const handleSelectDocument = (document: PDFDocument) => {
    setSelectedDocument(document);
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (size === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (chooseFileDialogOpen) {
      loadDocuments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chooseFileDialogOpen]);

const handleSignatureSelection = async (signature: Signature) => {
  try {
    const response = await api.get(`v1/signatures/${signature.id}/file`, {
      responseType: 'blob'
    });
    
    const signatureBlob = new Blob([response.data], { type: 'image/png' });
    
    // Set the blob as the signature file (useSignatureManager should accept Blob)
    setSignatureFile(signatureBlob as any);
    
    const img = new Image();
    const url = URL.createObjectURL(signatureBlob);
    img.src = url;
    
    img.onload = () => {
      setSignatureImg(img);
      
      // Create default position using standard coordinates (no flip needed)
      const defaultRect: Rect = {
        x: 100,
        y: 100,
        width: img.width,
        height: img.height
      };
      
      rectRef.current = defaultRect;
      addSignaturePlacement(currentPage, defaultRect);
      
      // Redraw canvas with signature
      if (canvasRef.current && pageImage) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Draw PDF (no flip needed)
          ctx.drawImage(pageImage, 0, 0);
          
          // Draw signature (no flip needed)
          ctx.drawImage(img, defaultRect.x, defaultRect.y, defaultRect.width, defaultRect.height);
          
          // Draw border
          ctx.strokeStyle = "#708993";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(defaultRect.x, defaultRect.y, defaultRect.width, defaultRect.height);
          ctx.setLineDash([]);
        }
      }
    };

    img.onerror = () => {
      console.error('Failed to load signature image');
      toast.error('Failed to load signature image');
    };

    setSelectedSignature(signature);
    setChooseSignatureTypeDialogOpen(false);
    toast.success(`${signature.signatureType} signature selected`);

  } catch (error) {
    console.error('Error loading signature:', error);
    toast.error('Failed to load signature');
  }
};

  return (
    <>
      {(isInitializing || isLoadingPdf) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#19183B] mx-auto"></div>
            <p className="mt-4 text-center">
              {isInitializing ? 'Loading document...' : 'Loading PDF content...'}
            </p>
          </div>
        </div>
      )}

      <div className="relative min-h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)`,
          }}
        ></div>

        <div className="absolute inset-0 bg-black/30"></div>

        <div className="relative p-6 max-w-12xl mx-auto flex items-center justify-center min-h-screen">
          <div
            id="content"
            className="relative bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden w-full flex flex-col"
            style={{ height: "calc(100vh - 3rem)" }}
          >
            {/* Header */}
            <div className="bg-white border-b border-[#A1C2BD] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#A1C2BD] rounded-lg">
                  <File className="w-6 h-6 text-[#19183B]" />
                </div>
                <div>
                  <p className="text-[#708993] text-sm">
                    {selectedDocument ? selectedDocument.fileName : "No document selected"}
                    {isLoadingPdf && " (Loading...)"}
                  </p>
                </div>
              </div>
            </div>

            {/* PDF Navigation and Controls - Only show when a document is loaded */}
            {pdf && selectedDocument && (
              <div className="bg-white border-b border-[#A1C2BD] p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handlePreviousPage}
                    disabled={currentPage <= 1}
                    variant="outline"
                    className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <span className="text-sm font-medium text-[#19183B]">
                    Page {currentPage} of {pdf.numPages}
                  </span>

                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage >= pdf.numPages}
                    variant="outline"
                    className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  <Input
                    type="number"
                    min="1"
                    max={pdf.numPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = Math.max(1, Math.min(pdf.numPages, parseInt(e.target.value) || 1));
                      setCurrentPage(page);
                    }}
                    className="w-20 text-center border-[#A1C2BD] focus:ring-[#708993]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  {currentSignaturePosition && signatureImg && (
                    <>
                      <Button
                        onClick={handleCopyToPages}
                        variant="outline"
                        className="border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy to Pages
                      </Button>
                      <Button
                        onClick={handleRemoveSignature}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Remove Signature
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={signaturePlacements.size === 0 || selectedDocument === null}
                    className="bg-[#19183B] hover:bg-[#708993] text-white"
                  >
                    Submit Signature
                  </Button>
                </div>
              </div>
            )}

            {/* Canvas Area */}
            <div 
              className="overflow-y-auto overflow-x-auto bg-gray-400 p-6"
              style={{ 
                flex: '1 1 0',
                minHeight: 0
              }}
            >
              <div className="flex justify-center">
                {!selectedDocument ? (
                  <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                    <File className="w-16 h-16 mb-4 text-white" />
                    <p className="text-lg text-white">Choose a PDF document to get started</p>
                  </div>
                ) : isLoadingPdf ? (
                  <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A1C2BD]"></div>
                    <p className="text-lg mt-4">Loading PDF...</p>
                  </div>
                ) : !pdf ? (
                  <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                    <File className="w-16 h-16 mb-4" />
                    <p className="text-lg">Failed to load PDF</p>
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                    className="border border-[#A1C2BD] touch-none"
                    style={{
                      cursor: isHoveringSignature ? 'grab' : isDrawing ? 'crosshair' : 'default',
                      display: 'block',
                      maxWidth: '100%'
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button - only show if not preloaded*/}
      <div className="fixed bottom-8 right-8 flex flex-col items-end gap-4">
        {isFabOpen && (
          <div className="flex flex-col gap-3">
            {/* Only show Choose PDF button if no document is loaded */}
            {!selectedDocument && !preloadedDocument && (
              <button
                onClick={handleChooseFile}
                className="flex items-center gap-3 bg-white text-[#19183B] pl-4 pr-5 py-3 rounded-full shadow-lg hover:scale-105 border-2 border-[#A1C2BD] hover:bg-[#E7F2EF] transition-all"
              >
                <div className="p-2 bg-[#A1C2BD] rounded-full">
                  <File className="w-5 h-5 text-[#19183B]" />
                </div>
                <span className="font-semibold">Choose PDF</span>
              </button>
            )}

            <button
              onClick={handleChooseSignatureType}
              className="flex items-center gap-3 bg-white text-[#19183B] pl-4 pr-5 py-3 rounded-full shadow-lg hover:scale-105 border-2 border-[#A1C2BD]"
            >
              <div className="p-2 bg-[#A1C2BD] rounded-full">
                <FileSignature className="w-5 h-5 text-[#19183B]" />
              </div>
              <span className="font-semibold">Sign</span>
            </button>

            {!preloadedDocument && (
            <button
              onClick={handleFullScreen}
              className="flex items-center gap-3 bg-white text-[#19183B] pl-4 pr-5 py-3 rounded-full shadow-lg hover:scale-105 border-2 border-[#A1C2BD]"
            >
              <div className="p-2 bg-[#A1C2BD] rounded-full">
                {isFullScreen ? (
                  <Minimize className="w-5 h-5 text-[#19183B]" />
                ) : (
                  <Fullscreen className="w-5 h-5 text-[#19183B]" />
                )}
              </div>
              <span className="font-semibold">
                {isFullScreen ? "Minimize" : "Fullscreen"}
              </span>
              </button>
              )}
          </div>
        )}

        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
            isFabOpen
              ? "bg-red-500 hover:bg-red-600 rotate-45"
              : "bg-[#19183B] hover:bg-[#708993]"
          }`}
        >
          <Plus className="w-8 h-8 text-white" />
        </button>
      </div>

      {/* Add a close button if onClose prop is provided */}
      {onClose && (
        <button
          onClick={onClose}
          className="fixed top-4 right-4 p-2 bg-white rounded-full shadow-lg z-50 hover:bg-gray-100"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      {/* Password Dialog */}
      <Dialog.Root open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD] flex flex-col">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <Key className="w-6 h-6 text-[#19183B]" />
              </div>
              Certificate Password
            </Dialog.Title>

            <p className="text-[#708993] mb-6">
              Please enter the password for your .p12 certificate to sign the document.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#19183B] mb-2">
                  Certificate Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your certificate password"
                  value={certificatePassword}
                  onChange={(e) => setCertificatePassword(e.target.value)}
                  className="border-[#A1C2BD] focus:ring-[#708993]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordConfirm();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPasswordDialogOpen(false);
                    setCertificatePassword("");
                    setError(null);
                  }}
                  className="flex-1 border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
                  disabled={verifying}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePasswordConfirm}
                  disabled={!certificatePassword || verifying}
                  className="flex-1 bg-[#19183B] hover:bg-[#708993] text-white"
                >
                  {verifying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing...
                    </>
                  ) : (
                    'Sign Document'
                  )}
                </Button>
              </div>
            </div>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-red-50 rounded-lg">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* File Dialog */}
      <Dialog.Root open={chooseFileDialogOpen} onOpenChange={setChooseFileDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] p-6 border-2 border-[#A1C2BD] flex flex-col">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <File className="w-6 h-6 text-[#19183B]" />
              </div>
              Choose File
            </Dialog.Title>

            <p className="text-[#708993] mb-6">
              Select the file to be loaded in the signature canvas from your uploaded PDF document.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#708993] w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:outline-none focus:border-[#19183B]"
                />
              </div>
            </form>

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto mb-6">
              <div className="space-y-3">
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-[#708993]">No documents found</div>
                ) : (
                  documents.map((document) => (
                    <div
                      key={document.id}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedDocument?.id === document.id
                          ? "border-[#19183B] bg-[#E7F2EF]"
                          : "border-[#A1C2BD] hover:border-[#19183B]"
                      }`}
                      onClick={() => handleSelectDocument(document)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <File className="w-8 h-8 text-[#19183B]" />
                          <div>
                            <h3 className="font-semibold">{document.fileName}</h3>
                            <div className="text-sm text-[#708993] flex gap-3">
                              <span>{formatFileSize(document.fileSize)}</span>
                              <span>{formatDate(document.uploadedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <button className="p-2 hover:bg-[#A1C2BD] rounded-lg">
                          <Eye className="w-5 h-5 text-[#19183B]" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Dialog Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setChooseFileDialogOpen(false);
                  setSelectedDocument(null);
                  setSearchTerm("");
                }}
                className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={handleOpenDocument}
                disabled={!selectedDocument || isLoadingPdf}
                className="flex-1 px-6 py-3 bg-[#19183B] text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoadingPdf ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading...
                  </>
                ) : (
                  'Open'
                )}
              </button>
            </div>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-red-50 rounded-lg">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Signature Type Dialog */}
      <Dialog.Root open={chooseSignatureTypeDialogOpen} onOpenChange={setChooseSignatureTypeDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] p-6 border-2 border-[#A1C2BD] flex flex-col">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileSignature className="w-6 h-6 text-[#19183B]" />
              </div>
              Choose Signature Type
            </Dialog.Title>

            <p className="text-[#708993] mb-6">
              Select the type of signature you want to use. (Default signature)
            </p>

            {/* Radio buttons with image preview */}
            <div className="space-y-4 mb-6">
              {/* Full Signature Option */}
              {signatures.find(sig => sig.signatureType === "FULL") && (
                <label className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[#A1C2BD] cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="signatureType"
                    value="FULL"
                    checked={selectedSignatureType === 'FULL'}
                    onChange={(e) => setSelectedSignatureType(e.target.value as 'INITIAL' | 'FULL')}
                    className="w-4 h-4 text-[#19183B] focus:ring-[#A1C2BD]"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-[#19183B] mb-2">Full Signature</div>
                    <div className="bg-gray-100 p-3 rounded-lg border min-h-[80px] flex items-center justify-center">
                      <SignatureCardPreview
                        previewUrl={signatures.find(sig => sig.signatureType === "FULL")?.previewUrl || ""}
                      />
                      <div className="fallback-full text-xl font-signature text-[#19183B] hidden">
                        Full Signature
                      </div>
                    </div>
                  </div>
                </label>
              )}

              {/* Initials Signature Option */}
              {signatures.find(sig => sig.signatureType === "INITIAL") && (
                <label className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[#A1C2BD] cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="signatureType"
                    value="INITIAL"
                    checked={selectedSignatureType === 'INITIAL'}
                    onChange={(e) => setSelectedSignatureType(e.target.value as 'INITIAL' | 'FULL')}
                    className="w-4 h-4 text-[#19183B] focus:ring-[#A1C2BD]"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-[#19183B] mb-2">Initial</div>
                    <div className="bg-gray-100 p-3 rounded-lg border min-h-[80px] flex items-center justify-center">
                      <SignatureCardPreview
                        previewUrl={signatures.find(sig => sig.signatureType === "INITIAL")?.previewUrl || ""}
                      />
                      <div className="fallback-initial text-xl font-bold text-[#19183B] hidden">
                        Initials
                      </div>
                    </div>
                  </div>
                </label>
              )}
            </div>

            {/* Dialog Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setChooseSignatureTypeDialogOpen(false)}
                className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (selectedSignatureType) {
                    const selectedSignature = signatures.find(
                      sig => sig.signatureType === selectedSignatureType
                    );
                    
                    if (selectedSignature) {
                      handleSignatureSelection(selectedSignature);
                      setChooseSignatureTypeDialogOpen(false);
                    }
                  }
                }}
                disabled={!selectedSignatureType}
                className="flex-1 px-6 py-3 bg-[#19183B] text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Sign
              </button>
            </div>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-red-50 rounded-lg">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Copy Mode Dialog */}
      <Dialog.Root open={copyModeDialogOpen} onOpenChange={setCopyModeDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD] flex flex-col sm:max-w-md">
            <Dialog.Title className="flex items-center gap-2 text-xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <Copy className="w-5 h-5 text-[#19183B]" />
              </div>
            </Dialog.Title>
            <div className="space-y-5 pt-4">
              <p className="text-sm text-[#708993]">
                Specify which pages to copy the signature to:
              </p>
              <div>
                <label className="block text-sm font-medium text-[#19183B] mb-2">
                  Page Numbers
                </label>
                <Input
                  type="text"
                  placeholder="e.g., 1,4,7-10 or 'all'"
                  value={copyToPages}
                  onChange={(e) => setCopyToPages(e.target.value)}
                  className="text-base border-[#A1C2BD] focus:ring-[#708993]"
                />
                <p className="text-xs text-[#708993] mt-2">
                  Examples: "1,4" (pages 1 and 4), "1-10" (pages 1 to 10), "all" (all pages)
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCopyModeDialogOpen(false);
                    setCopyToPages("");
                  }}
                  className="flex-1 border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCopyConfirm}
                  disabled={!copyToPages.trim()}
                  className="flex-1 bg-[#19183B] hover:bg-[#708993]"
                >
                  Copy Signature
                </Button>
              </div>
            </div>
            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-red-50 rounded-lg">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export default UserPdfSigner;