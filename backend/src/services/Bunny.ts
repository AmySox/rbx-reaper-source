// ===========================
// SECTION | IMPORTS
// ===========================
import { bunnyAccessKey } from '@keys';
import axios from 'axios';
import formidable from 'formidable';
import { createReadStream } from 'fs';
// =========================== !SECTION

// ===========================
// SECTION | Bunny
// ===========================
export class Bunny {
  /**
   * Upload a file
   *
   * @param file The file to upload
   * @param path The path to upload the file to
   */
  static async uploadFile(file: formidable.File, path: string) {
    const fileStream = createReadStream(file.filepath);

    console.info(fileStream);

    await axios.put(
      `https://storage.bunnycdn.com/rblx-reaper-slow-assets/${path}`,
      fileStream,
      {
        headers: {
          AccessKey: bunnyAccessKey,
          'Content-Type': 'application/octet-stream',
        },
      },
    );
  }
}
// =========================== !SECTION
