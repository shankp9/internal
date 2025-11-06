const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Parse a file and extract text content
 * @param {string} filePath - Path to the file
 * @param {string} fileType - File type (txt, pdf, docx)
 * @returns {Promise<string>} - Extracted text content
 */
async function parseFile(filePath, fileType) {
  try {
    switch (fileType.toLowerCase()) {
      case 'txt':
        return await parseTxtFile(filePath);
      case 'pdf':
        return await parsePdfFile(filePath);
      case 'docx':
        return await parseDocxFile(filePath);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    throw new Error(`Failed to parse file: ${error.message}`);
  }
}

/**
 * Parse a text file
 */
async function parseTxtFile(filePath) {
  return fs.promises.readFile(filePath, 'utf-8');
}

/**
 * Parse a PDF file
 */
async function parsePdfFile(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

/**
 * Parse a DOCX file
 */
async function parseDocxFile(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

module.exports = {
  parseFile,
};

