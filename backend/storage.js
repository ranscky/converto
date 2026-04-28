const fs = require('fs').promises;
const path = require('path');
const { existsSync } = require('fs');

/**
 * Storage Interface to decouple business logic from physical storage.
 * This allows us to pivot from Local Disk to S3/GCS without changing the pipeline.
 */
class LocalStorage {
  constructor(baseDir = 'uploads') {
    this.baseDir = path.resolve(baseDir);
    this.ensureDir();
  }

  async ensureDir() {
    if (!existsSync(this.baseDir)) {
      await fs.mkdir(this.baseDir, { recursive: true });
    }
  }

  async save(fileName, contentBuffer) {
    const filePath = path.join(this.baseDir, fileName);
    await fs.writeFile(filePath, contentBuffer);
    return filePath;
  }

  async delete(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (e) {
      console.error(`Failed to delete file ${filePath}: ${e.message}`);
    }
  }

  async exists(filePath) {
    return existsSync(filePath);
  }

  getPath(fileName) {
    return path.join(this.baseDir, fileName);
  }
}

// Export a singleton instance
module.exports = new LocalStorage();
