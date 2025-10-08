# Cosmote AI Backend Service (Node.js)

A Node.js backend service that processes documents using cursor-agent for feature extraction and test generation.

## Features

- **File Upload Support**: Handles TXT, PDF, and DOCX files
- **Document Processing**: Extracts content from various file formats
- **AI Integration**: Uses cursor-agent for feature extraction and test generation
- **RESTful API**: Simple endpoint structure matching FastAPI service
- **CORS Enabled**: Cross-origin requests supported

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Or start the production server:
```bash
npm start
```

## API Endpoints

### Health Check
- `GET /` - Service status and version
- `GET /liveness` - Kubernetes liveness probe
- `GET /readiness` - Kubernetes readiness probe

### Document Processing
- `POST /process-upload` - Upload and process documents

## Usage

### Upload and Process Document

```bash
curl -X POST http://localhost:3000/process-upload \
  -F "file=@your-document.pdf"
```

**Supported file formats:**
- `.txt` - Plain text files
- `.pdf` - PDF documents
- `.docx` - Microsoft Word documents
- `.doc` - Legacy Word documents

## Response Format

The service returns a response similar to the FastAPI service:

```json
{
  "features": [
    {
      "id": "feature_1",
      "title": "Feature Title",
      "description": "Detailed feature description",
      "category": "functional",
      "priority": "high"
    }
  ],
  "manual_tests": [
    {
      "id": "test_1",
      "title": "Test Case Title",
      "description": "Test case description",
      "type": "functional",
      "priority": "high",
      "steps": ["Step 1", "Step 2"],
      "expected_result": "Expected outcome"
    }
  ],
  "PipelineReportResponse": {
    "status": "success",
    "message": "Pipeline execution completed successfully",
    "stages_completed": ["file_upload", "content_extraction", "feature_extraction", "test_generation"],
    "features_count": 5,
    "tests_count": 10,
    "chunks_count": 1,
    "processing_messages": ["Successfully processed file"],
    "errors": [],
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Configuration

The service uses the following environment variables:
- `PORT` - Server port (default: 3000)
- `CURSOR_API_KEY` - Cursor agent API key (set automatically)

## Development

- **Development mode**: `npm run dev` (uses nodemon with legacy-watch)
- **Production mode**: `npm start`

## Dependencies

- **express**: Web framework
- **multer**: File upload handling
- **cors**: Cross-origin resource sharing
- **pdf-parse**: PDF text extraction
- **mammoth**: DOCX text extraction
- **fs-extra**: Enhanced file system operations
- **uuid**: Unique identifier generation
- **nodemon**: Development server with auto-restart

## Error Handling

The service includes comprehensive error handling for:
- File upload errors
- Unsupported file formats
- Document parsing failures
- Cursor-agent communication errors
- Temporary file cleanup

## Security

- Temporary files are automatically cleaned up after processing
- File uploads are restricted to supported formats
- CORS is configured for cross-origin requests