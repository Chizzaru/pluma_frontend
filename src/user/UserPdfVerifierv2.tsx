/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, FileText, Shield, Upload, Download, AlertTriangle } from 'lucide-react';

interface PDFDocument {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  status: string;
  uploadedAt: string;
}

interface UserPdfVerifierv2Props {
  preloadedDocument?: PDFDocument;
  onClose?: () => void;
}

// Define TypeScript interfaces for structured data
interface SignatureResult {
  valid: boolean;
  signerName?: string;
  location?: string;
  reason?: string;
  signDate: string | number | Date;
  hasTimestamp?: boolean;
  timestampDate?: string | number | Date;
  certificateValid?: boolean;
  documentIntegrityValid?: boolean;
  error?: string;
}

interface VerificationResult {
  signatureCount: number;
  allValid: boolean;
  signatures: SignatureResult[];
}

export default function UserPdfVerifierv2({ preloadedDocument }: UserPdfVerifierv2Props) {
  const [file, setFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  // Add effect to load preloaded document
  useEffect(() => {
    if (preloadedDocument) {
      // Fetch the file from the server
      const loadDocument = async () => {
        try {
          const response = await fetch(`/api/v1/documents/view/${preloadedDocument.filePath}`);
          const blob = await response.blob();
          const file = new File([blob], preloadedDocument.fileName, { type: 'application/pdf' });
          setFile(file);
        } catch (error) {
          console.error('Error loading document:', error);
          setError('Failed to load document');
        }
      };
      loadDocument();
    }
  }, [preloadedDocument]);

  const verifySignatures = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setVerifying(true);
    setError(null);

    const formData = new FormData();
    formData.append('pdfDocument', file);

    try {
      const response = await fetch(`/api/v1/verify-document`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.verification as VerificationResult);
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError('Error connecting to server: ' + err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setVerifying(false);
    }
  };

  const formatDate = (timestamp: string | number | Date): string => {
    try {
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="relative min-h-[95vh] bg-[#E7F2EF]">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)` }}
      />
      <div className="absolute inset-0 bg-black/30"></div>

      {/* Main scrollable container */}
      <div className="relative h-[95vh] overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header with Home Button */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#A1C2BD] rounded-lg">
                  <Shield className="w-6 h-6 text-[#19183B]" />
                </div>
                <h1 className="text-3xl font-bold text-[#19183B]">Verify PDF</h1>
              </div>
              <p className="text-[#708993] ml-14">Verify digital signatures and timestamps in your PDF documents</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Upload Panel */}
              <Card className="border border-[#A1C2BD] shadow-sm">
                <CardHeader className="bg-white rounded-t-lg border-b border-[#A1C2BD]">
                  <CardTitle className="text-lg text-[#19183B] flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Document Upload
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="text-sm text-[#708993]">
                      {file ? (
                        <div className="flex items-center gap-2 p-3 bg-[#E7F2EF] rounded-lg border border-[#A1C2BD]">
                          <FileText className="w-4 h-4 text-[#19183B]" />
                          <span className="font-medium text-[#19183B] truncate">{file.name}</span>
                        </div>
                      ) : (
                        <p className="text-center py-2">No file selected</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Panel */}
              <Card className="border border-[#A1C2BD] shadow-sm">
                <CardHeader className="bg-white rounded-t-lg border-b border-[#A1C2BD]">
                  <CardTitle className="text-lg text-[#19183B] flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Verification Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#E7F2EF]">
                      <span className="text-[#708993]">PDF Document</span>
                      {file ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#A1C2BD]" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#E7F2EF]">
                      <span className="text-[#708993]">Verification Status</span>
                      {result ? (
                        result.signatureCount === 0 ? (
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        ) : result.allValid ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )
                      ) : (
                        <Clock className="w-5 h-5 text-[#A1C2BD]" />
                      )}
                    </div>
                    {result && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-[#E7F2EF]">
                        <span className="text-[#708993]">Signatures Found</span>
                        <span className={`font-bold ${result.signatureCount === 0 ? 'text-amber-600' : 'text-[#19183B]'}`}>
                          {result.signatureCount}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <div className="bg-white rounded-xl p-6 border border-[#A1C2BD]">
                <h3 className="font-semibold text-[#19183B] mb-3">How to Verify</h3>
                <ol className="space-y-2 text-sm text-[#708993]">
                  <li className="flex gap-2">
                    <span className="font-semibold text-[#19183B]">1.</span>
                    <span>Upload your signed PDF document</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-[#19183B]">2.</span>
                    <span>Click "Verify Signatures" button</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-[#19183B]">3.</span>
                    <span>Review signature details and validity</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-[#19183B]">4.</span>
                    <span>Check certificate and document integrity</span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload Area */}
              <Card className="border border-[#A1C2BD] shadow-sm">
                <CardContent className="p-6 space-y-4">
                {/* Custom File Input */}
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors bg-[#E7F2EF]/50 ${
                  preloadedDocument 
                    ? 'border-gray-300 cursor-not-allowed opacity-60' 
                    : 'border-[#A1C2BD] hover:border-[#19183B] cursor-pointer'
                }`}>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pdf-upload"
                    disabled={!!preloadedDocument}
                  />
                  <label 
                    htmlFor="pdf-upload" 
                    className={preloadedDocument ? 'cursor-not-allowed' : 'cursor-pointer'}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="w-12 h-12 text-[#708993]" />
                      <div>
                        <p className="text-lg font-semibold text-[#19183B]">
                          {file ? file.name : 'Choose PDF File'}
                        </p>
                        <p className="text-sm text-[#708993] mt-1">
                          {preloadedDocument 
                            ? 'Document loaded from system' 
                            : file 
                            ? 'Click to change file' 
                            : 'or drag and drop here'}
                        </p>
                      </div>
                      {!file && !preloadedDocument && (
                        <div className="flex items-center gap-2 text-xs text-[#708993] bg-white px-3 py-2 rounded-lg border border-[#A1C2BD]">
                          <Download className="w-4 h-4" />
                          Select PDF document
                        </div>
                      )}
                      {preloadedDocument && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                          <FileText className="w-4 h-4" />
                          Preloaded Document
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                  <Button 
                    onClick={verifySignatures} 
                    disabled={!file || verifying} 
                    className="w-full bg-[#19183B] text-white py-3 rounded-xl font-semibold hover:bg-[#708993] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    {verifying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Verifying Signatures...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Verify Signatures
                      </>
                    )}
                  </Button>

                  {error && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">{error}</AlertDescription>
                      </div>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Results Section - Removed individual scroll container */}
              {result && (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#A1C2BD] shadow-sm">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[#19183B]" />
                      <div>
                        <span className="font-medium text-[#19183B]">Total Signatures:</span>
                        <span className={`text-lg font-bold ml-2 ${result.signatureCount === 0 ? 'text-amber-600' : 'text-[#19183B]'}`}>
                          {result.signatureCount}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.signatureCount === 0 ? (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          <span className="text-amber-600 font-semibold">No Signatures Found</span>
                        </>
                      ) : result.allValid ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-600 font-semibold">All Valid</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-600" />
                          <span className="text-red-600 font-semibold">Issues Found</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* No Signatures Warning */}
                  {result.signatureCount === 0 && (
                    <div className="p-4 border-2 border-amber-200 bg-amber-50 rounded-xl">
                      <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-amber-900 mb-2">No Digital Signatures Detected</p>
                          <p className="text-sm text-amber-800 leading-relaxed">
                            This PDF document does not contain any digital signatures. The document may be unsigned or use a different signing method.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Individual Signatures - No scroll container here */}
                  {result.signatureCount > 0 && (
                    <div className="space-y-4">
                      {result.signatures.map((sig, index) => (
                        <Card 
                          key={index} 
                          className={`border-2 ${
                            sig.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                          } rounded-xl shadow-sm`}
                        >
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                {sig.valid ? (
                                  <CheckCircle className="w-6 h-6 text-green-600" />
                                ) : (
                                  <XCircle className="w-6 h-6 text-red-600" />
                                )}
                                <CardTitle className="text-xl text-[#19183B]">
                                  Signature #{index + 1}
                                </CardTitle>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  sig.valid 
                                    ? 'bg-green-100 text-green-800 border border-green-200' 
                                    : 'bg-red-100 text-red-800 border border-red-200'
                                }`}
                              >
                                {sig.valid ? 'Valid' : 'Invalid'}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              
                              <div className="space-y-1">
                                <span className="font-medium text-[#19183B]">Signer:</span>
                                <p className="text-[#708993]">{sig.signerName || 'Unknown'}</p>
                              </div>

                              <div className="space-y-1">
                                <div className='flex gap-1'>
                                  <Clock className="w-4 h-4 text-[#708993]" />
                                  <span className="font-medium text-[#19183B]">Signed:</span>
                                </div>
                                <p className="text-[#708993]">{formatDate(sig.signDate)}</p>
                              </div>
                            
                            </div>


                            {sig.hasTimestamp && sig.timestampDate && (
                              <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <CheckCircle className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-blue-900">TSA Timestamp:</span>
                                <span className="text-blue-700">{formatDate(sig.timestampDate)}</span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-sm">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-3 h-3 rounded-full ${
                                    sig.certificateValid ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                ></span>
                                <span className="text-[#19183B]">
                                  Certificate {sig.certificateValid ? 'Valid' : 'Invalid'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-3 h-3 rounded-full ${
                                    sig.documentIntegrityValid ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                ></span>
                                <span className="text-[#19183B]">
                                  Document {sig.documentIntegrityValid ? 'Intact' : 'Modified'}
                                </span>
                              </div>
                            </div>

                            {sig.error && (
                              <Alert variant="destructive" className="mt-3 border-red-200 bg-red-50">
                                <AlertDescription className="text-red-800 text-sm">
                                  {sig.error}
                                </AlertDescription>
                              </Alert>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}