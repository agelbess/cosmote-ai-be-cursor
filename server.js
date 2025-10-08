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
        const prompt = `You are an AI assistant specialized in analyzing Functional Specification Documents (FSD) for telecommunications systems, particularly FTTH (Fiber to the Home) operations and STM/FSM integration.

Please analyze the following document and:

1. Extract all functional features and requirements with detailed use cases
2. Generate comprehensive manual test cases for the extracted features

IMPORTANT GUIDELINES:
1. Include both happy path and error scenarios
2. Ensure test data includes relevant field names and values
3. Make descriptions comprehensive and technically accurate
4. Provide your analysis in JSON format with the following strict structure, no other text or comments are allowed:

As a response you must use this structure:
{
  "features": [
    {
      "feature_id": "001",
      "title": "Feature Title",
      "status": "To be approved",
      "summary": "Brief summary of the feature",
      "description": "Detailed feature description explaining the functionality, system interactions, and business logic",
      "priority": "High|Medium|Low",
      "issue_type": "Story|Epic|Task|Bug",
      "use_cases": [
        {
          "use_case_id": "001.1",
          "title": "Use Case Title",
          "actor": "Primary actor, Secondary actors, Systems involved",
          "preconditions": "Conditions that must be met before the use case can start",
          "main_flow": [
            "Step 1: Description of what happens",
            "Step 2: Description of what happens next",
            "Step 3: Continue with detailed steps"
          ],
          "postconditions": "State of the system after successful completion",
          "alternate_flows": "Description of alternative paths or error handling",
          "test_data": [
            {
              "data_type": "Data field name",
              "value": "Expected or test value"
            }
          ]
        }
      ],
      "comments": "Additional notes or comments",
      "feature_name": "Feature Name (same as title)",
      "feature_description": "Same as description field"
    }
  ],
  "manual_tests": [
    {
      "manual_test_id": "28",
      "use_case_id": "012.2",
      "test_name": "Test Case Name",
      "feature_name": "Related Feature Name",
      "use_case_name": "Related Use Case Name",
      "status": "To be approved",
      "description": "Detailed test case description explaining what is being tested",
      "priority": "High|Medium|Low",
      "test_type": "Functional|Integration|Unit|Performance|Regression",
      "preconditions": "Conditions that must be met before test execution",
      "steps": [
        {
          "test_step_id": "28.1",
          "title": "Step title describing the action",
          "expected_result": "What should happen as a result of this step",
          "test_data": [
            {
              "data_type": "Data field name",
              "value": "Test value or expected value"
            }
          ]
        }
      ],
      "postconditions": "State after test completion",
      "pass_fail_criteria": "Clear criteria for determining test success or failure",
      "dependency_with": "Any dependencies on other tests or features",
      "e2e": "y|n",
      "core": "y|n",
      "triggering_system": "System that triggers this test (STM|FSM|COM|GIS|MCV)",
      "comments": "Additional test notes"
    }
  ],
  "PipelineReportResponse": {
    "status": "success",
    "errors": [],
    "timestamp": "2025-10-08T10:09:16.528349"
  }
}

Document content:
START OF DOCUMENT
${fileContent}
END OF DOCUMENT
`;


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
        res.json(parsedResponse);
        
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
