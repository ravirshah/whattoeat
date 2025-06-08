'use client';

import React, { useState, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
  Button, 
  Badge,
  Alert,
  AlertDescription
} from '@/components/ui';
import { toast } from 'sonner';
import { 
  Upload, 
  FileText, 
  X, 
  Eye,
  Trash2,
  Activity,
  Heart,
  BarChart3,
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react';
import { HealthDocument } from '@/types/weekly-planner';
import { addHealthDocument, getUserHealthDocuments, updateHealthDocument, deleteHealthDocument } from '@/lib/weekly-planner-db';

interface HealthDocumentsProps {
  userId: string;
  onDocumentsChange?: (documents: HealthDocument[]) => void;
}

const DOCUMENT_TYPES = [
  { value: 'blood_panel', label: 'Blood Panel', icon: Activity, color: 'text-red-600' },
  { value: 'inbody_scan', label: 'InBody Scan', icon: BarChart3, color: 'text-blue-600' },
  { value: 'dexascan', label: 'DEXA Scan', icon: BarChart3, color: 'text-purple-600' },
  { value: 'medical_report', label: 'Medical Report', icon: Heart, color: 'text-green-600' },
  { value: 'other', label: 'Other Health Document', icon: FileText, color: 'text-gray-600' }
] as const;

export default function HealthDocuments({ userId, onDocumentsChange }: HealthDocumentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<HealthDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>('blood_panel');
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load health documents on mount
  React.useEffect(() => {
    loadHealthDocuments();
  }, [userId]);

  const loadHealthDocuments = async () => {
    try {
      setLoading(true);
      const userDocs = await getUserHealthDocuments(userId);
      setDocuments(userDocs);
      onDocumentsChange?.(userDocs);
    } catch (error) {
      console.error('Error loading health documents:', error);
      toast.error('Failed to load health documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a PDF, Word document, text file, or image');
        return;
      }
      
      // Check file size (max 10MB for health documents)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      toast.success(`File "${file.name}" selected`);
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    // Handle PDF files with browser-side text extraction fallback
    if (file.type === 'application/pdf') {
      try {
        // For now, convert PDF to base64 and let the AI processing endpoint handle it
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === 'string') {
              // Return the base64 data with a marker that this is a PDF
              resolve(`[PDF_BASE64_DATA]${result}`);
            } else {
              reject(new Error('Failed to read PDF file'));
            }
          };
          
          reader.onerror = () => {
            reject(new Error('Failed to read PDF file'));
          };
          
          reader.readAsDataURL(file);
        });

      } catch (pdfError) {
        console.error('PDF reading error:', pdfError);
        throw new Error(`Failed to read PDF file: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
      }
    }

    // Handle other file types
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      if (file.type.startsWith('image/')) {
        // For images, we'll need OCR - for now, use filename as fallback
        resolve(`Image file: ${file.name} - Manual review required for health data extraction.`);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setIsUploading(true);

    try {
      // Read file content
      console.log(`Reading file content for: ${selectedFile.name}, type: ${selectedFile.type}`);
      const fileContent = await readFileContent(selectedFile);
      console.log(`Successfully extracted ${fileContent.length} characters from file`);
      
      // Log a preview of the content for debugging (first 500 chars)
      console.log('File content preview:', fileContent.substring(0, 500));

      // Get auth token
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken();

      // Process document with AI
      console.log('Sending document to AI for processing...');
      const response = await fetch('/whattoeat/api/process-health-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileContent,
          fileType: selectedDocType,
          fileName: selectedFile.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error response from API:', errorData);
        
        // If there are helpful suggestions, show them to the user
        if (errorData.suggestions && Array.isArray(errorData.suggestions)) {
          const suggestionText = errorData.suggestions.join('\n');
          const fullMessage = `${errorData.error}\n\n${errorData.details}\n\n${suggestionText}`;
          throw new Error(fullMessage);
        }
        
        throw new Error(errorData.error || 'Failed to process health document');
      }

      const analysisResult = await response.json();
      console.log('AI analysis result:', analysisResult);

      // Save to database
      const healthDoc: Omit<HealthDocument, 'id'> = {
        userId,
        fileName: selectedFile.name,
        fileType: selectedDocType as HealthDocument['fileType'],
        uploadedAt: new Date() as any, // Will be converted to Timestamp in DB function
        parsedData: analysisResult.parsedData,
        aiSummary: analysisResult.aiSummary,
        isActive: true
      };

      const docId = await addHealthDocument(healthDoc);

      // Update local state
      const newDoc: HealthDocument = {
        id: docId,
        ...healthDoc,
        uploadedAt: new Date() as any
      };

      const updatedDocs = [newDoc, ...documents];
      setDocuments(updatedDocs);
      onDocumentsChange?.(updatedDocs);

      // Reset form
      setSelectedFile(null);
      setSelectedDocType('blood_panel');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success('Health document uploaded and processed successfully!');
    } catch (error) {
      console.error('Error uploading health document:', error);
      
      // Show a more helpful error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload health document. Please try again.';
      
      // If the error message contains suggestions (multiple lines), show it as a detailed toast
      if (errorMessage.includes('\n')) {
        // For now, show a simplified error message, but log the full details
        console.error('Detailed error information:', errorMessage);
        toast.error('PDF processing failed. Check the console for detailed alternatives, or try converting your PDF to text format first.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleActive = async (docId: string, isActive: boolean) => {
    try {
      await updateHealthDocument(docId, { isActive });
      
      const updatedDocs = documents.map(doc => 
        doc.id === docId ? { ...doc, isActive } : doc
      );
      setDocuments(updatedDocs);
      onDocumentsChange?.(updatedDocs);

      toast.success(`Document ${isActive ? 'activated' : 'deactivated'} for meal planning`);
    } catch (error) {
      console.error('Error updating document status:', error);
      toast.error('Failed to update document status');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this health document?')) {
      return;
    }

    try {
      await deleteHealthDocument(docId);
      
      const updatedDocs = documents.filter(doc => doc.id !== docId);
      setDocuments(updatedDocs);
      onDocumentsChange?.(updatedDocs);

      toast.success('Health document deleted successfully');
    } catch (error) {
      console.error('Error deleting health document:', error);
      toast.error('Failed to delete health document');
    }
  };

  const getDocumentTypeInfo = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type) || DOCUMENT_TYPES[0];
  };

  const renderHealthMetrics = (doc: HealthDocument) => {
    const data = doc.parsedData;
    const metrics = [];

    // Blood panel metrics
    if (data.cholesterolTotal) metrics.push({ label: 'Total Cholesterol', value: `${data.cholesterolTotal} mg/dL` });
    if (data.glucose) metrics.push({ label: 'Glucose', value: `${data.glucose} mg/dL` });
    if (data.hemoglobinA1c) metrics.push({ label: 'HbA1c', value: `${data.hemoglobinA1c}%` });
    if (data.vitaminD) metrics.push({ label: 'Vitamin D', value: `${data.vitaminD} ng/mL` });

    // Body composition metrics
    if (data.bodyFatPercentage) metrics.push({ label: 'Body Fat', value: `${data.bodyFatPercentage}%` });
    if (data.BMI) metrics.push({ label: 'BMI', value: data.BMI.toString() });
    if (data.muscleMass) metrics.push({ label: 'Muscle Mass', value: `${data.muscleMass} lbs` });

    // Vital signs
    if (data.bloodPressureSystolic && data.bloodPressureDiastolic) {
      metrics.push({ label: 'Blood Pressure', value: `${data.bloodPressureSystolic}/${data.bloodPressureDiastolic} mmHg` });
    }

    return metrics;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
          <span className="ml-2">Loading health documents...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2 text-emerald-600" />
            Upload Health Document
          </CardTitle>
          <CardDescription>
            Upload blood panels, body composition scans, or other health reports to get personalized meal recommendations
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your health data is processed securely using AI to provide personalized nutrition recommendations. 
              All data is encrypted and only used for meal planning suggestions.
            </AlertDescription>
          </Alert>

          {/* Document Type Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Document Type</label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {DOCUMENT_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    variant={selectedDocType === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDocType(type.value)}
                    className="justify-start"
                    disabled={isUploading}
                  >
                    <Icon className={`h-4 w-4 mr-2 ${type.color}`} />
                    {type.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Select Health Document (PDF, Word, Image, Text)
            </Button>

            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing Document...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process Document
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Health Documents ({documents.length})</CardTitle>
          <CardDescription>
            Manage your uploaded health documents and their integration with meal planning
          </CardDescription>
        </CardHeader>

        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Health Documents
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Upload your first health document to get personalized meal recommendations
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => {
                const typeInfo = getDocumentTypeInfo(doc.fileType);
                const Icon = typeInfo.icon;
                const metrics = renderHealthMetrics(doc);
                const isExpanded = expandedDoc === doc.id;

                return (
                  <div
                    key={doc.id}
                    className={`border rounded-lg p-4 transition-all ${
                      doc.isActive ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Icon className={`h-5 w-5 ${typeInfo.color}`} />
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {doc.fileName}
                          </h3>
                          <Badge variant={doc.isActive ? "default" : "secondary"}>
                            {doc.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">
                            {typeInfo.label}
                          </Badge>
                        </div>

                        {doc.aiSummary && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {doc.aiSummary}
                          </p>
                        )}

                        {metrics.length > 0 && (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                            {metrics.slice(0, 4).map((metric, index) => (
                              <div key={index} className="text-sm">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {metric.label}:
                                </span>
                                <br />
                                <span className="text-gray-600 dark:text-gray-400">
                                  {metric.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {doc.parsedData.healthConcerns && doc.parsedData.healthConcerns.length > 0 && (
                          <div className="mb-3">
                            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                              Health Considerations:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {doc.parsedData.healthConcerns.map((concern, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {concern}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant={doc.isActive ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleToggleActive(doc.id, !doc.isActive)}
                        >
                          {doc.isActive ? (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* All Metrics */}
                          {metrics.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Health Metrics</h4>
                              <div className="space-y-2">
                                {metrics.map((metric, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">{metric.label}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{metric.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Dietary Recommendations */}
                          {doc.parsedData.dietaryRecommendations && doc.parsedData.dietaryRecommendations.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Dietary Recommendations</h4>
                              <div className="space-y-1">
                                {doc.parsedData.dietaryRecommendations.map((rec, index) => (
                                  <Badge key={index} variant="outline" className="mr-2 mb-1">
                                    {rec}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Raw Data */}
                        {doc.parsedData.rawExtractedText && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Extracted Data</h4>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm text-gray-600 dark:text-gray-400">
                              {doc.parsedData.rawExtractedText}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 text-xs text-gray-500">
                          Uploaded: {doc.uploadedAt && typeof doc.uploadedAt === 'object' && 'seconds' in doc.uploadedAt 
                            ? new Date(doc.uploadedAt.seconds * 1000).toLocaleDateString()
                            : doc.uploadedAt 
                            ? new Date(doc.uploadedAt).toLocaleDateString()
                            : 'Unknown date'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 