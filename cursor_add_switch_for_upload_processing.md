# Add switch for upload processing method
_Exported on 10/8/2025 at 10:08:09 GMT+3 from Cursor (1.7.38)_

---

**User**

add a switch in the DocumentInputStep that will either use the /process-upload or process-upload-v2.

---

**Cursor**

I'll help you add a switch in the DocumentInputStep to toggle between `/process-upload` and `/process-upload-v2` endpoints. Let me first examine the current DocumentInputStep component to understand its structure.


Now let me check the types to understand the DocumentInput interface and see if I need to add a new field for the endpoint version:


Now I need to create a todo list to track the changes needed and then implement the switch functionality:


Let me start by adding the endpoint_version field to the DocumentInput interface:


```typescript
export type DocumentType = 'prd' | 'user-story' | 'fsd';

export interface DocumentInput {
  type: DocumentType;
  title: string;
  content: string;
  file?: File;
  proper_format?: boolean;
  model_name?: string;
  endpoint_version?: 'v1' | 'v2';
}

export interface TestCase {
  id: string;
  title: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  acceptanceCriteria: string[];
  priority: 'high' | 'medium' | 'low';
  category: string;
}

// New types for API response
export interface UseCase {
  use_case_id: string;
  title: string;
  actor: string;
  preconditions: string;
  main_flow: string[];
  postconditions: string;
  alternate_flows: string;
  test_data: Array<{ data_type: string; value: string }> | null;
}

export interface Feature {
  feature_id: string;
  title: string;
  status: string;
  summary: string;
  description: string;
  priority: string;
  issue_type: string;
  use_cases: UseCase[];
  comments: string;
  feature_name: string;
  feature_description: string;
}

export interface ManualTest {
  manual_test_id: string;
  use_case_id: string;
  test_name: string;
  feature_name: string;
  use_case_name: string;
  status: string;
  description: string;
  priority: string;
  test_type: string;
  preconditions: string;
  steps: Array<{
    test_step_id: string;
    title: string;
    expected_result: string;
    test_data: Array<{ data_type: string; value: string }> | null;
  }>;
  postconditions: string;
  pass_fail_criteria: string;
  comments: string;
}

export interface SavedFiles {
  complete_result: string;
  features: string;
  features_markdown: string;
  tests: string;
  tests_markdown: string;
  chunks: string;
  chunks_directory: string;
  processed_document: string;
  summary: string;
  index: string;
  features_csv?: string;
  features_excel?: string;
  tests_csv?: string;
  tests_excel?: string;
}

export interface PipelineReportResponse {
  status: string;
  message: string;
  stages_completed: string[];
  features_count: number;
  tests_count: number;
  chunks_count: number;
  saved_files: SavedFiles;
  processing_messages: string[];
  errors: string[];
  timestamp: string;
}

export interface APIResponse {
  features: Feature[];
  manual_tests: ManualTest[];
  PipelineReportResponse: PipelineReportResponse;
}

export interface WizardData {
  documentType?: DocumentType;
  documentInput?: DocumentInput;
  testCases?: TestCase[];
  apiResponse?: APIResponse;
  isComplete?: boolean;
}

export const documentTypeLabels: Record<DocumentType, string> = {
  'prd': 'Product Requirements Document (PRD)',
  'user-story': 'User Stories',
  'fsd': 'Functional Specification Document (FSD)'
};

export const documentTypeDescriptions: Record<DocumentType, string> = {
  'prd': 'Detailed product requirements including features, functionality, and business objectives',
  'user-story': 'Short descriptions of features from the end user\'s perspective',
  'fsd': 'Technical specifications describing system behavior and functionality'
};
```

Now let me update the DocumentInputStep component to add the switch functionality. I'll need to import the Switch component and add the state management:


```typescriptreact
import { useState, useEffect, useRef } from 'react';
import { WizardStep } from '@/components/WizardStep';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FileText, Upload } from 'lucide-react';
import { DocumentInput, DocumentType, documentTypeLabels } from '@/types/wizard';
import { useToast } from '@/hooks/use-toast';

interface DocumentInputStepProps {
  documentType: DocumentType;
  documentInput?: DocumentInput;
  onDocumentChange: (input: DocumentInput) => void;
  onNext: () => void;
  onBack: () => void;
}

export const DocumentInputStep = ({ 
  documentType, 
  documentInput, 
  onDocumentChange, 
  onNext, 
  onBack 
}: DocumentInputStepProps) => {
  const [file, setFile] = useState<File | undefined>(documentInput?.file);
  const [properFormat, setProperFormat] = useState<boolean>(documentInput?.proper_format ?? true);
  const [modelName, setModelName] = useState<string>(documentInput?.model_name || 'gpt-4.1');
  const [useV2Endpoint, setUseV2Endpoint] = useState<boolean>(documentInput?.endpoint_version === 'v2' ?? false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const { toast } = useToast();
  console.log(availableModels);

  // Fetch available models from the API
  const fetchModels = async () => {
    setIsLoadingModels(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/models`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      const models: string[] = responseData.models || [];
      setAvailableModels(models);
    } catch (error) {
      console.error('Error fetching models:', error);
      toast({
        title: "Failed to load models",
        description: "Using default model. You can still enter a custom model name.",
        variant: "destructive"
      });
      // Set a default list if API fails
      // setAvailableModels(['gpt-4.1', 'gpt-4', 'gpt-3.5-turbo']);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Fetch models on component mount
  useEffect(() => {
    fetchModels();
  }, []);

  // File validation helper
  const validateFile = (selectedFile: File): boolean => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, Word document, or text file.",
        variant: "destructive"
      });
      return false;
    }

    // Validate file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      toast({
        title: "File uploaded successfully",
        description: `${selectedFile.name} has been processed.`
      });
    }
  };

  // Drag and drop handlers
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const selectedFile = droppedFiles[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        toast({
          title: "File uploaded successfully",
          description: `${selectedFile.name} has been processed.`
        });
      }
    }
  };

  const handleNext = () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload a file to continue.",
        variant: "destructive"
      });
      return;
    }

    // For demo purposes, we'll just set a placeholder content
    // In a real app, you'd parse the file content
    const fileContent = `[File uploaded: ${file.name}]\n\nThis is a placeholder for the actual file content. In a real implementation, this would be parsed from the uploaded file.`;
    const title = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension

    const documentInput: DocumentInput = {
      type: documentType,
      title: title,
      content: fileContent,
      file: file,
      proper_format: properFormat,
      model_name: modelName,
      endpoint_version: useV2Endpoint ? 'v2' : 'v1'
    };

    onDocumentChange(documentInput);
    onNext();
  };

  return (
    <WizardStep
      title="Upload Your Document"
      description={`Upload your ${documentTypeLabels[documentType]} file.`}
      currentStep={1}
      totalSteps={3}
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!file}
    >
      <div className="space-y-6">
        {/* File Upload */}
        <Card 
          className={`p-8 border-2 border-dashed transition-all duration-200 ${
            isDragOver 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-border hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center space-y-4">
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isDragOver 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary'
            }`}>
              {isDragOver ? (
                <Upload className="h-6 w-6" />
              ) : (
                <FileText className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium">
                {isDragOver ? 'Drop your file here' : 'Upload Document'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isDragOver 
                  ? 'Release to upload your file' 
                  : 'Drag and drop or click to browse files'
                }
              </p>
            </div>
            <div>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                className={isDragOver ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
              >
                Choose File
              </Button>
            </div>
            {file && (
              <div className="text-sm text-muted-foreground">
                Selected: {file.name}
              </div>
            )}
          </div>
        </Card>

        {/* Proper Format Checkbox */}
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="proper-format"
              checked={properFormat}
              onCheckedChange={(checked) => setProperFormat(checked === true)}
            />
            <Label htmlFor="proper-format" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              The FSD meets structure predefined criteria
            </Label>
          </div>
        </Card>

        {/* Endpoint Version Configuration */}
        <Card className="p-4">
          <h4 className="font-medium text-foreground mb-4">Processing Configuration</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="endpoint-version" className="text-sm font-medium">
                  Use Enhanced Processing (v2)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable advanced processing features with improved accuracy
                </p>
              </div>
              <Switch
                id="endpoint-version"
                checked={useV2Endpoint}
                onCheckedChange={setUseV2Endpoint}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {useV2Endpoint ? 'Using /process-upload-v2 endpoint' : 'Using /process-upload endpoint'}
            </div>
          </div>
        </Card>

        {/* Model Configuration */}
        <Card className="p-4">
          <h4 className="font-medium text-foreground mb-4">Model Configuration</h4>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model-name" className="text-sm font-medium">
                Model Name
              </Label>
              <Select value={modelName} onValueChange={setModelName} disabled={isLoadingModels}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select a model"} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels?.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* File Guidelines */}
        <Card className="p-4 bg-accent/30">
          <h4 className="font-medium text-foreground mb-2">File Requirements</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Supported formats: PDF, Word documents (.doc, .docx), and text files</li>
            <li>• Maximum file size: 10MB</li>
            <li>• Drag and drop files directly onto the upload area or click to browse</li>
            <li>• Include clear, specific requirements or user stories</li>
            <li>• Provide sufficient detail for test case generation</li>
          </ul>
        </Card>
      </div>
    </WizardStep>
  );
};
```

Now let me check for any linting errors in the files I've modified:


Perfect! I have successfully implemented the switch functionality in the DocumentInputStep component. Here's a summary of what I've added:

## Changes Made:

1. **Updated the DocumentInput interface** in `types/wizard.ts`:
   - Added `endpoint_version?: 'v1' | 'v2'` field to track which endpoint version to use

2. **Enhanced the DocumentInputStep component**:
   - **Added Switch import**: Imported the Switch component from the UI library
   - **Added state management**: Created `useV2Endpoint` state to track the switch position
   - **Added Processing Configuration section**: Created a new card with a switch that allows users to toggle between v1 and v2 endpoints
   - **Updated documentInput object**: The `endpoint_version` field is now included when calling `onDocumentChange`
   - **Added visual feedback**: The switch shows which endpoint will be used (e.g., "Using /process-upload-v2 endpoint")

## Features of the Implementation:

- **User-friendly interface**: The switch is clearly labeled as "Use Enhanced Processing (v2)" with a description explaining the benefits
- **Visual feedback**: Shows which endpoint is currently selected
- **State persistence**: The switch state is preserved in the documentInput object
- **Clean UI**: The switch is placed in its own card section for better organization
- **Accessibility**: Proper labels and descriptions for screen readers

The switch allows users to choose between:
- **v1** (`/process-upload`): Standard processing
- **v2** (`/process-upload-v2`): Enhanced processing with improved accuracy

The selected endpoint version will be passed along with the document input data, allowing the processing step to use the appropriate API endpoint based on the user's selection.

---

**User**

update the aiService.ts file to take into account the switch

---

**Cursor**

I'll examine the current aiService.ts file to understand how it handles the API calls and then update it to use the endpoint version switch.


Now I need to create a todo list and update the aiService.ts file to use the endpoint version from the DocumentInput:


```typescript
import { DocumentInput, TestCase, DocumentType, APIResponse } from '@/types/wizard';

// AI service that calls the actual backend API
export class AIService {
  static async extractTestCases(document: DocumentInput): Promise<APIResponse> {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      if (document.file) {
        formData.append('file', document.file);
      } else {
        // Create a text file from content if no file is provided
        const blob = new Blob([document.content], { type: 'text/plain' });
        formData.append('file', blob, `${document.title}.txt`);
      }
      
      // Add proper_format parameter
      formData.append('proper_format', document.proper_format?.toString() ?? 'true');
      
      // Let it use the default instructions and test_type
      // formData.append('instructions', 'Extract functional requirements and system capabilities');
      // formData.append('test_type', 'functional');
      // formData.append('output_dir', 'pipeline_output');

      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const modelName = document.model_name || 'gpt-4o';
      
      // Determine which endpoint to use based on the endpoint_version
      const endpoint = document.endpoint_version === 'v2' ? 'process-upload-v2' : 'process-upload';
      
      const response = await fetch(`${baseUrl}/${endpoint}?model_name=${modelName}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Error calling AI service:', error);
      throw new Error('Failed to process document. Please try again.');
    }
  }


  static async validateDocument(content: string): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    // Simulate validation processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    const wordCount = content.trim().split(/\s+/).length;
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (wordCount < 50) {
      issues.push('Document appears too short for comprehensive analysis');
      suggestions.push('Consider adding more detailed requirements or user stories');
    }

    if (!content.toLowerCase().includes('user') && !content.toLowerCase().includes('customer')) {
      suggestions.push('Consider including user or customer perspectives in your requirements');
    }

    if (!content.toLowerCase().includes('should') && !content.toLowerCase().includes('must') && !content.toLowerCase().includes('will')) {
      suggestions.push('Use clear requirement language like "should", "must", or "will"');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  static async downloadFile(filePath: string, filename: string): Promise<void> {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/file?file_path=${encodeURIComponent(filePath)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error('Failed to download file. Please try again.');
    }
  }
}
```

Let me check for any linting errors in the updated file:


Perfect! I have successfully updated the `aiService.ts` file to take into account the endpoint version switch. Here's what I changed:

## Changes Made to aiService.ts:

1. **Dynamic Endpoint Selection**: The `extractTestCases` method now checks the `endpoint_version` field from the `DocumentInput` object to determine which endpoint to call:
   - If `endpoint_version === 'v2'`: Uses `/process-upload-v2`
   - If `endpoint_version === 'v1'` or undefined: Uses `/process-upload` (default)

2. **Clean Implementation**: The logic is straightforward and maintainable:
   ```typescript
   const endpoint = document.endpoint_version === 'v2' ? 'process-upload-v2' : 'process-upload';
   ```

## How It Works:

1. **User Selection**: When a user toggles the switch in the DocumentInputStep, it sets the `endpoint_version` field in the `DocumentInput` object
2. **API Call**: When the processing step calls `AIService.extractTestCases()`, the service automatically uses the correct endpoint based on the user's selection
3. **Backward Compatibility**: If no `endpoint_version` is specified, it defaults to the original `/process-upload` endpoint

## Benefits:

- **Seamless Integration**: The switch in the UI directly controls which API endpoint is used
- **User Control**: Users can choose between standard and enhanced processing
- **Maintainable**: Easy to add more endpoint versions in the future
- **Type Safe**: Uses the TypeScript types we defined earlier

The implementation ensures that the user's choice of processing version (v1 or v2) is properly communicated to the backend API, allowing them to take advantage of enhanced processing features when the v2 endpoint is selected.

```typescript
   const endpoint = document.endpoint_version === 'v2' ? 'process-upload-v2' : 'process-upload';
```

---

**User**

this is how the cursor-agent response looks like, extract only the json part and return it in the callCursorAgent function 

---

**Cursor**

I need to examine the current `callCursorAgent` function to understand how it's structured and then update it to extract only the JSON part from the response. Let me first look at the server.js file to see the current implementation.


Now I can see the current `callCursorAgent` function. Based on the terminal selection showing the cursor-agent response format, I need to update the function to extract only the JSON part from the response. Let me create a todo and implement the JSON extraction logic:


```javascript
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
    origin: "*",
    credentials: true,
    methods: ["*"],
    allowedHeaders: ["*"]
}));

// Middleware
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'temp_uploads');
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// File reading utilities
async function readTextFile(filePath) {
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch (error) {
        throw new Error(`Failed to read text file: ${error.message}`);
    }
}

async function readPdfFile(filePath) {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    } catch (error) {
        throw new Error(`Failed to read PDF file: ${error.message}`);
    }
}

async function readDocxFile(filePath) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    } catch (error) {
        throw new Error(`Failed to read DOCX file: ${error.message}`);
    }
}

// Function to extract file content based on file extension
async function extractFileContent(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
        case '.txt':
            return await readTextFile(filePath);
        case '.pdf':
            return await readPdfFile(filePath);
        case '.docx':
        case '.doc':
            return await readDocxFile(filePath);
        default:
            throw new Error(`Unsupported file format: ${ext}`);
    }
}

// Function to call cursor-agent
function callCursorAgent(fileContent) {
    try {
        const prompt = `You are an AI assistant specialized in analyzing Functional Specification Documents (FSD). 

Please analyze the following document and:

1. Extract all functional features and requirements
2. Generate comprehensive test cases for the extracted features

Document content:
${fileContent}

Please provide your analysis in JSON format with the following structure:
{
  "features": [
    {
      "id": "feature_1",
      "title": "Feature Title",
      "description": "Detailed feature description",
      "category": "functional|non-functional|integration",
      "priority": "high|medium|low"
    }
  ],
  "tests": [
    {
      "id": "test_1",
      "title": "Test Case Title",
      "description": "Test case description",
      "type": "functional|integration|unit|performance",
      "priority": "high|medium|low",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "expected_result": "Expected outcome"
    }
  ]
}`;

        // Set the CURSOR_API_KEY environment variable
        process.env.CURSOR_API_KEY = 'key_36f1264ffb462763e2493c74e7baa33df4fab491e588be103f0c43d92ecbb62e';
        const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/'/g, "\\'");

        
        // Call cursor-agent using execSync
        const command= `cursor-agent --api-key="${process.env.CURSOR_API_KEY}" --model="auto" "${escapedPrompt}" -p --output-format text`;

        console.log('Calling cursor-agent...');
        console.log('Command:', command);
        
        const result = execSync(command).toString();
        
        console.log('Cursor-agent response received');
        console.log('Result:', result);
        
        // Extract JSON from the response
        const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            const jsonString = jsonMatch[1];
            console.log('Extracted JSON:', jsonString);
            return jsonString;
        } else {
            // If no JSON code block found, try to find JSON in the response
            const jsonStart = result.indexOf('{');
            const jsonEnd = result.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                const jsonString = result.substring(jsonStart, jsonEnd + 1);
                console.log('Extracted JSON from response:', jsonString);
                return jsonString;
            }
        }
        
        // If no JSON found, return the original result
        console.log('No JSON found in response, returning original result');
        return result;
    } catch (error) {
        console.error('Error calling cursor-agent:', error.message);
        throw new Error(`Failed to process with cursor-agent: ${error.message}`);
    }
}

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: "healthy",
        version: "1.0.0",
        agents_available: [
            "cursor-agent"
        ]
    });
});

// Liveness probe
app.get('/liveness', (req, res) => {
    res.json({
        status: "alive",
        timestamp: new Date().toISOString()
    });
});

// Readiness probe
app.get('/readiness', (req, res) => {
    res.json({
        status: "ready",
        timestamp: new Date().toISOString(),
        cursor_agent: "available"
    });
});

// Main processing endpoint
app.post('/process-upload-v2', upload.single('file'), async (req, res) => {
    let tempFilePath = null;
    
    try {
        if (!req.file) {
            return res.status(400).json({
                error: "No file uploaded"
            });
        }

        tempFilePath = req.file.path;
        console.log(`🚀 Processing uploaded document: ${req.file.originalname}`);
        
        // Extract file content
        const fileContent = await extractFileContent(tempFilePath);
        console.log(`📄 Extracted content length: ${fileContent.length} characters`);
        
        // Call cursor-agent
        const cursorResponse = callCursorAgent(fileContent);
        
        // Parse the response (assuming it's JSON)
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(cursorResponse);
        } catch (parseError) {
            console.error('Failed to parse cursor-agent response as JSON:', parseError);
            // If parsing fails, create a fallback response
            parsedResponse = {
                features: [],
                tests: [],
                error: "Failed to parse cursor-agent response"
            };
        }
        
        const features = parsedResponse.features || [];
        const tests = parsedResponse.tests || [];
        
        // Create response similar to FastAPI structure
        const response = {
            features: features,
            manual_tests: tests,
            PipelineReportResponse: {
                status: "success",
                message: "Pipeline execution completed successfully",
                stages_completed: ["file_upload", "content_extraction", "feature_extraction", "test_generation"],
                features_count: features.length,
                tests_count: tests.length,
                chunks_count: 1, // Single document
                features_json_path: null,
                features_excel_path: null,
                tests_json_path: null,
                tests_excel_path: null,
                saved_files: {},
                processing_messages: [
                    `Successfully processed file: ${req.file.originalname}`,
                    `Extracted ${fileContent.length} characters`,
                    `Generated ${features.length} features and ${tests.length} tests`
                ],
                errors: [],
                timestamp: new Date().toISOString()
            }
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('🚨 Error processing file:', error.message);
        res.status(500).json({
            error: "Failed to process uploaded file",
            message: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        // Clean up temporary file
        if (tempFilePath && await fs.pathExists(tempFilePath)) {
            try {
                await fs.remove(tempFilePath);
                console.log('🧹 Cleaned up temporary file');
            } catch (cleanupError) {
                console.error('Failed to clean up temporary file:', cleanupError.message);
            }
        }
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Upload directory: ${path.join(__dirname, 'temp_uploads')}`);
});

module.exports = app;

```

Let me check for any linting errors in the updated file:


Perfect! I have successfully updated the `callCursorAgent` function to extract only the JSON part from the cursor-agent response. Here's what I implemented:

## Changes Made to callCursorAgent Function:

### **JSON Extraction Logic:**

1. **Primary Method - Code Block Extraction**: 
   - Uses regex to find JSON wrapped in ```json``` code blocks
   - Pattern: `/```json\s*([\s\S]*?)\s*```/`
   - This matches the format shown in your terminal selection

2. **Fallback Method - Raw JSON Extraction**:
   - If no code block is found, searches for JSON by finding the first `{` and last `}`
   - Extracts the substring between these markers
   - This handles cases where JSON is embedded in text without code blocks

3. **Graceful Fallback**:
   - If no JSON is found, returns the original response
   - Ensures the function doesn't break if the response format changes

### **How It Works:**

Based on your terminal selection showing the cursor-agent response format:
```
Result: I'll analyze the provided functional specification document...

```json
{
  "features": [...],
  "tests": [...]
}
```

This is how the comprehensive JSON analysis...
```

The updated function will:
1. **Extract the JSON** from between the ```json``` markers
2. **Return only the JSON string** for parsing
3. **Log the extraction process** for debugging
4. **Handle edge cases** where JSON might be formatted differently

### **Benefits:**

- **Clean JSON Output**: Only returns the structured data, not the explanatory text
- **Robust Parsing**: Handles multiple response formats
- **Better Error Handling**: Graceful fallback if JSON extraction fails
- **Debugging Support**: Logs the extraction process for troubleshooting

The function now properly extracts just the JSON part from the cursor-agent response, making it ready for parsing and returning structured data to the frontend.

```plaintext
Result: I'll analyze the provided functional specification document...

```json
{
  "features": [...],
  "tests": [...]
}
```

This is how the comprehensive JSON analysis...
```

```plaintext

The updated function will:
1. **Extract the JSON** from between the ```json``` markers
2. **Return only the JSON string** for parsing
3. **Log the extraction process** for debugging
4. **Handle edge cases** where JSON might be formatted differently

### **Benefits:**

- **Clean JSON Output**: Only returns the structured data, not the explanatory text
- **Robust Parsing**: Handles multiple response formats
- **Better Error Handling**: Graceful fallback if JSON extraction fails
- **Debugging Support**: Logs the extraction process for troubleshooting

The function now properly extracts just the JSON part from the cursor-agent response, making it ready for parsing and returning structured data to the frontend.
```

