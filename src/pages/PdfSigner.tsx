/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// PdfSigner.tsx
import React, { useEffect, useRef, useState } from "react";
import "pdfjs-dist/web/pdf_viewer.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Image as ImageIcon, Key, CheckCircle, Copy ,Home} from "lucide-react";
import { GlobalWorkerOptions } from "pdfjs-dist";

// Components
import { SignatureCanvas } from "../components/SignatureCanvas";
import { PageNavigation } from "../components/PageNavigation";
import { StatusPanel } from "../components/StatusPanel";
import { UploadPanel } from "../components/UploadPanel";

// Hooks
import { usePdfLoader } from "../hooks/usePdfLoader";
import { useSignatureManager } from "../hooks/useSignatureManager";
import { useFileDownload } from "../hooks/useFileDownload";


// API
import api from "@/api/axiosInstance";


GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function PdfSigner() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // State
  const [file, setFile] = useState<File | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number; xOffset?: number; yOffset?: number } | null>(null);
  // @ts-expect-error - unused state for future feature
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pageImage, setPageImage] = useState<HTMLImageElement | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [certificatePassword, setCertificatePassword] = useState<string>("");
  const [canvasWidth, setCanvasWidth] = useState<number>(0);
  const [canvasHeight, setCanvasHeight] = useState<number>(0);
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);
  const [isHoveringSignature, setIsHoveringSignature] = useState(false);
  const [copyModeDialogOpen, setCopyModeDialogOpen] = useState(false);
  const [copyToPages, setCopyToPages] = useState<string>("");
  const [userLocation, setUserLocation] = useState<string>("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState("");

  // @ts-expect-error - unused state for future feature
  const [error, setError] = useState<string | null>(null);
  // @ts-expect-error - unused state for future feature
  const [verifying, setVerifying] = useState<boolean>(false);


  const { downloadFile } = useFileDownload();
  
  // Hooks
  const { pdf, currentPage, setCurrentPage } = usePdfLoader(file);
  const {
    signatureFile,
    signatureImg,
    certificate,
    signaturePlacements,
    multiPageMode,
    setSignatureImg,
    setMultiPageMode,
    handleSignatureUpload,
    handleCertificateUpload,
    addSignaturePlacement,
    removeSignaturePlacement,
    updateSignaturePlacement,
    setSignaturePlacements,
  } = useSignatureManager();

  const currentSignaturePosition = signaturePlacements.get(currentPage) || null;

  // Render current page
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    
    const renderPage = async () => {
      const page = await pdf.getPage(currentPage);
      const desiredWidth = 800;
      const originalViewport = page.getViewport({ scale: 1 });
      const scale = desiredWidth / originalViewport.width;
      
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      setCanvasWidth(viewport.width);
      setCanvasHeight(viewport.height);

      await page.render({ canvas: canvas, canvasContext: context, viewport }).promise;

      const img = new window.Image();
      img.src = canvas.toDataURL();
      setPageImage(img);
    };
    
    renderPage();
    setRect(null);
  }, [pdf, currentPage]);

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
      return () => canvas.removeEventListener('mouseleave', handleMouseLeave);
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current || !pageImage) return;
    
    const canvas = canvasRef.current;
    const rectBounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rectBounds.width;
    const scaleY = canvas.height / rectBounds.height;
    
    const x = (e.clientX - rectBounds.left) * scaleX;
    const y = (e.clientY - rectBounds.top) * scaleY;

    const sigPos = signaturePlacements.get(currentPage) || null;

    // Check if clicked inside signature (start dragging)
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
      e.preventDefault();
      return;
    }

    // If there's already a signature on the page, don't start drawing
    if (sigPos && signatureImg) return;

    // Otherwise, start drawing selection
    setStartPos({ x, y });
    setIsDrawing(true);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDraggingSignature) {
      setIsDraggingSignature(false);
      setStartPos(null);
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      setStartPos(null);
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect && rect && rect.width !== 0 && rect.height !== 0) {
        setModalPosition({ x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top });
        setModalOpen(true);
      }
    }
  };

  const drawCanvas = ({ x, y }: { x: number; y: number }) => {
    if (!canvasRef.current || !pageImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(pageImage, 0, 0);

    const sigPos = currentSignaturePosition;

    if (isDraggingSignature && sigPos && startPos && signatureImg) {
      const newX = Math.max(0, Math.min(x - (startPos.xOffset ?? 0), canvas.width - sigPos.width));
      const newY = Math.max(0, Math.min(y - (startPos.yOffset ?? 0), canvas.height - sigPos.height));
      
      const newPos = { ...sigPos, x: newX, y: newY };
      ctx.drawImage(signatureImg, newPos.x, newPos.y, newPos.width, newPos.height);
      
      // Draw selection border with brand color
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

      // Hover effect with brand color
      if (isHoveringSignature) {
        ctx.strokeStyle = "#708993";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(sigPos.x, sigPos.y, sigPos.width, sigPos.height);
        ctx.setLineDash([]);
      }
    }

    // Draw selection rectangle with brand color
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
      setRect({ x: selX, y: selY, width: selW, height: selH });
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      setSignaturePlacements(new Map());
    }
  };

  const handleConfirm = () => {
    if (!canvasRef.current || !rect || !signatureFile || !pageImage) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        setSignatureImg(img);
        addSignaturePlacement(currentPage, rect);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(signatureFile);
    setModalOpen(false);
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
    if (signaturePlacements.size === 0 || !certificate || !signatureFile) {
      alert("Please select a certificate and place a signature");
      return;
    }
    setPasswordDialogOpen(true);
  };

const handlePasswordConfirm = async () => {
  if (!certificatePassword) {
    alert("Please enter a password");
    return;
  }

  const formData = new FormData();
  formData.append("certificateFile", certificate!);
  formData.append("signatureImage", signatureFile!);
  formData.append("pdfDocument", file!);
  formData.append("password", certificatePassword);
  formData.append("canvasWidth", canvasWidth.toString());
  formData.append("canvasHeight", canvasHeight.toString());
  formData.append("location", userLocation || "Unknown Location");

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
    // Replace fetch with axios
    const response = await api.post("v1/sign-document-multi", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Axios automatically parses JSON response
    const data = response.data;

    if (data.signedFile) {
      await downloadFile(data.signedFile);

      setPasswordDialogOpen(false);
      setCertificatePassword("");

      alert(`Signature submitted successfully! Signed on ${signaturePlacements.size} page(s)`);
    } else {
      setError(data.error || "Verification failed");
    }
  } catch (err: any) {
    // Handle axios errors
    if (err.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (err.response.status === 403) {
        setError("Access denied — you do not have permission to sign this document.");
        return;
      }
      setError(err.response.data?.error || `HTTP error! status: ${err.response.status}`);
    } else if (err.request) {
      // The request was made but no response was received
      setError("No response from server. Please check your connection.");
    } else {
      // Something happened in setting up the request that triggered an Error
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
    const newPlacements = new Map(signaturePlacements);
    
    pages.forEach(pageNum => {
      if (pageNum !== currentPage) {
        newPlacements.set(pageNum, { ...currentSignaturePosition });
      }
    });
    
    setSignaturePlacements(newPlacements);
    setCopyModeDialogOpen(false);
    setCopyToPages("");
    setMultiPageMode(true);
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

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser");
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          
          if (response.ok) {
            const locationData = await response.json();
            const locationString = `${locationData.city}, ${locationData.countryName}`;
            setUserLocation(locationString);
          } else {
            setUserLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch (error) {
          const { latitude, longitude } = position.coords;
          setUserLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        setIsGettingLocation(false);
        alert("Error getting location. Please enter manually.");
      }
    );
  };

  const handleManualLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualLocation(e.target.value);
    setUserLocation(e.target.value);
  };

  return (
    
    <div className="min-h-screen bg-[#E7F2EF] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <FileText className="w-6 h-6 text-[#19183B]" />
              </div>
              <h1 className="text-3xl font-bold text-[#19183B]">Pluma | Digital PDF Signer</h1>
            </div>
            <p className="text-[#708993] ml-14">Securely sign your PDF documents with digital certificates</p>
          </div>

          {/* Home Button */}
          <a
            href={ `${import.meta.env.BASE_URL}` }
            className="ml-auto inline-flex items-center gap-2 bg-[#A1C2BD] text-[#19183B] font-semibold px-4 py-2 rounded-lg hover:bg-[#8FB4AE] transition-colors duration-200"
          >
            <Home className="w-5 h-5" />
            Home
          </a>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <UploadPanel onPdfUpload={handlePdfUpload} file={file} />
            <StatusPanel
              file={file}
              certificate={certificate}
              signatureFile={signatureFile}
              signaturePlacements={signaturePlacements}
              multiPageMode={multiPageMode}
            />
            
            {/* Instructions */}
            <div className="bg-[#A1C2BD]/20 rounded-xl p-6 border border-[#A1C2BD]">
              <h3 className="font-semibold text-[#19183B] mb-3">How to Sign</h3>
              <ol className="space-y-2 text-sm text-[#708993]">
                <li className="flex gap-2"><span className="font-semibold text-[#19183B]">1.</span><span>Upload your PDF document</span></li>
                <li className="flex gap-2"><span className="font-semibold text-[#19183B]">2.</span><span>Draw a rectangle where you want the signature</span></li>
                <li className="flex gap-2"><span className="font-semibold text-[#19183B]">3.</span><span>Upload certificate and signature image</span></li>
                <li className="flex gap-2"><span className="font-semibold text-[#19183B]">4.</span><span>Click Submit and enter your password</span></li>
                <li className="flex gap-2"><span className="font-semibold text-[#19183B]">5.</span><span>Drag and drop signature to reposition</span></li>
              </ol>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {pdf && (
              <PageNavigation
                pdf={pdf}
                currentPage={currentPage}
                signaturePosition={currentSignaturePosition}
                signatureImg={signatureImg}
                signaturePlacements={signaturePlacements}
                onPreviousPage={handlePreviousPage}
                onNextPage={handleNextPage}
                onPageChange={setCurrentPage}
                onCopyToPages={handleCopyToPages}
                onRemoveSignature={handleRemoveSignature}
                onSubmit={handleSubmit}
              />
            )}

            {/* Canvas Area */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-[#A1C2BD]">
              {!pdf ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                  <FileText className="w-16 h-16 mb-4" />
                  <p className="text-lg">Upload a PDF to get started</p>
                </div>
              ) : (
                <SignatureCanvas
                  canvasRef={canvasRef}
                  pageImage={pageImage}
                  signatureImg={signatureImg}
                  signaturePosition={currentSignaturePosition}
                  isDrawing={isDrawing}
                  isDraggingSignature={isDraggingSignature}
                  isHoveringSignature={isHoveringSignature}
                  startPos={startPos}
                  currentPage={currentPage}
                  onMouseDown={handleMouseDown}
                  onMouseMove={() => {}}
                  onMouseUp={handleMouseUp}
                  drawCanvas={drawCanvas}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <ImageIcon className="w-5 h-5 text-[#19183B]" />
              </div>
              Add Signature Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#19183B] mb-2">
                <Key className="w-4 h-4" />
                Certificate File (.p12/.pfx)
              </label>
              <Input
                type="file"
                accept=".p12,.pfx"
                onChange={handleCertificateUpload}
                className="cursor-pointer border-[#A1C2BD] focus:ring-[#708993]"
              />
              {certificate && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {certificate.name}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#19183B] mb-2">
                <ImageIcon className="w-4 h-4" />
                Signature Image
              </label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                className="cursor-pointer border-[#A1C2BD] focus:ring-[#708993]"
              />
              {signatureFile && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {signatureFile.name}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex-1 border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!certificate || !signatureFile}
                className="flex-1 bg-[#19183B] hover:bg-[#708993]"
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-[#A1C2BD]/30 rounded-lg">
                <Key className="w-5 h-5 text-[#19183B]" />
              </div>
              Enter Certificate Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <p className="text-sm text-[#708993]">
              Please enter your certificate password to complete the signing process
            </p>
            
            {/* Location Section */}
            <div>
              <label className="block text-sm font-medium text-[#19183B] mb-2">
                Signing Location
              </label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  onClick={getUserLocation}
                  disabled={isGettingLocation}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
                >
                  {isGettingLocation ? "Detecting..." : "Detect Location"}
                </Button>
              </div>
              <Input
                type="text"
                placeholder="Enter signing location manually"
                value={manualLocation}
                onChange={handleManualLocationChange}
                className="text-base border-[#A1C2BD] focus:ring-[#708993]"
              />
              {userLocation && (
                <p className="text-xs text-green-600 mt-2">
                  Location: {userLocation}
                </p>
              )}
            </div>

            <Input
              type="password"
              placeholder="Enter certificate password"
              value={certificatePassword}
              onChange={(e) => setCertificatePassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handlePasswordConfirm();
                }
              }}
              className="text-base border-[#A1C2BD] focus:ring-[#708993]"
            />
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPasswordDialogOpen(false);
                  setCertificatePassword("");
                  setUserLocation("");
                  setManualLocation("");
                }}
                className="flex-1 border-[#A1C2BD] text-[#19183B] hover:bg-[#E7F2EF]"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordConfirm}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Sign Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Mode Dialog */}
      <Dialog open={copyModeDialogOpen} onOpenChange={setCopyModeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <Copy className="w-5 h-5 text-[#19183B]" />
              </div>
              Copy Signature to Pages
            </DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}