const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 5001;
const OLLAMA_URL = 'http://localhost:11434';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Ollama API server is running' });
});

// Check if Ollama is running
app.get('/ollama-status', async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    res.json({ status: 'connected', models: response.data.models || [] });
  } catch (error) {
    res.status(503).json({ 
      status: 'disconnected', 
      error: 'Ollama server not accessible. Make sure Ollama is running on localhost:11434' 
    });
  }
});

// Generic ask endpoint for AI interaction
app.post('/ask', async (req, res) => {
  try {
    const { prompt, model = 'codellama' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model,
      prompt,
      stream: false
    });

    res.json({ 
      response: response.data.response,
      model: response.data.model,
      done: response.data.done
    });
  } catch (error) {
    console.error('Ollama API Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to communicate with Ollama',
      details: error.response?.data || error.message
    });
  }
});

// Analyze code for bugs and issues
app.post('/analyze', async (req, res) => {
  try {
    const { code, filename, language } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const prompt = `Analyze this ${language || 'code'} file (${filename || 'unknown'}) for bugs, security vulnerabilities, performance issues, and code quality problems. Provide a detailed analysis with specific line numbers where possible:

\`\`\`${language || 'javascript'}
${code}
\`\`\`

Please categorize issues as:
1. SYNTAX_ERROR - Code that won't compile/run
2. RUNTIME_ERROR - Potential runtime failures
3. SECURITY_VULNERABILITY - Security risks
4. PERFORMANCE_ISSUE - Performance problems
5. CODE_QUALITY - Style and maintainability issues

Format your response as JSON with this structure:
{
  "issues": [
    {
      "type": "SECURITY_VULNERABILITY",
      "severity": "high|medium|low",
      "line": 15,
      "message": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "summary": "Overall assessment"
}`;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: 'codellama',
      prompt,
      stream: false
    });

    // Try to parse JSON response, fallback to text if parsing fails
    let analysisResult;
    try {
      analysisResult = JSON.parse(response.data.response);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response from text
      analysisResult = {
        issues: [],
        summary: response.data.response,
        rawResponse: response.data.response
      };
    }

    res.json({
      analysis: analysisResult,
      filename,
      language
    });
  } catch (error) {
    console.error('Analysis Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to analyze code',
      details: error.response?.data || error.message
    });
  }
});

// Generate AI fixes for code
app.post('/fix', async (req, res) => {
  try {
    const { code, issues, filename, language } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const issuesText = issues ? issues.map(issue => 
      `- Line ${issue.line}: ${issue.message} (${issue.type})`
    ).join('\n') : 'General code improvement';

    const prompt = `Fix the following ${language || 'code'} file (${filename || 'unknown'}) based on these identified issues:

Issues to fix:
${issuesText}

Original code:
\`\`\`${language || 'javascript'}
${code}
\`\`\`

Please provide:
1. The complete fixed code
2. A summary of changes made
3. Explanation of each fix

Format your response as JSON:
{
  "fixedCode": "complete fixed code here",
  "changes": [
    {
      "line": 15,
      "original": "original code",
      "fixed": "fixed code",
      "explanation": "why this was changed"
    }
  ],
  "summary": "Overall summary of fixes applied"
}`;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: 'codellama',
      prompt,
      stream: false
    });

    // Try to parse JSON response
    let fixResult;
    try {
      fixResult = JSON.parse(response.data.response);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      fixResult = {
        fixedCode: response.data.response,
        changes: [],
        summary: 'AI-generated fix (raw response)',
        rawResponse: response.data.response
      };
    }

    res.json({
      fix: fixResult,
      filename,
      language
    });
  } catch (error) {
    console.error('Fix Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate fixes',
      details: error.response?.data || error.message
    });
  }
});

// Batch analyze multiple files
app.post('/analyze-batch', async (req, res) => {
  try {
    const { files } = req.body;
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array is required' });
    }

    const results = [];
    
    for (const file of files.slice(0, 10)) { // Limit to 10 files to prevent overload
      try {
        const analysisResponse = await axios.post(`http://localhost:${PORT}/analyze`, {
          code: file.content,
          filename: file.filename,
          language: file.language
        });
        
        results.push({
          filename: file.filename,
          success: true,
          analysis: analysisResponse.data.analysis
        });
      } catch (error) {
        results.push({
          filename: file.filename,
          success: false,
          error: error.message
        });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('Batch Analysis Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to perform batch analysis',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ollama API server running at http://localhost:${PORT}`);
  console.log(`📡 Make sure Ollama is running at ${OLLAMA_URL}`);
  console.log(`🤖 To install CodeLlama: ollama pull codellama`);
});

module.exports = app;