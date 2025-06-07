/**
 * Utility functions for Canvas file identification and processing
 */

/**
 * Determines if a file is a Canvas based on Slack file properties
 * @param file - Slack file object
 * @returns boolean indicating if the file is a Canvas
 */
export function isCanvasFile(file: {
  filetype?: string;
  mode?: string;
  pretty_type?: string;
}): boolean {
  return (
    file.filetype === 'canvas' ||
    file.mode === 'canvas' ||
    file.pretty_type === 'canvas' ||
    file.filetype === 'quip'
  );
}

/**
 * Filters an array of files to return only Canvas files
 * @param files - Array of Slack file objects
 * @returns Array of Canvas files only
 */
export function filterCanvasFiles<T extends {
  filetype?: string;
  mode?: string;
  pretty_type?: string;
}>(files: T[]): T[] {
  return files.filter(isCanvasFile);
}
