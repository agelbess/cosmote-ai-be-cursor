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
