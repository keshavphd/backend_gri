import type { NextFunction, Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import sharp from "sharp";

interface ProcessedFile extends Express.Multer.File {
  processed?: {
    path: { [size: number]: string }
  }
}

export const updateProcessUpload = (fieldname: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Handle existingPhotos parsing first
      if (req.body.existingPhotos) {
        try {
          req.body.existingPhotos = JSON.parse(req.body.existingPhotos);
        } catch (e) {
          // If parsing fails, set to empty array
          req.body.existingPhotos = [];
        }
      } else {
        // Initialize as empty array if not provided
        req.body.existingPhotos = [];
      }

      // Check if files exist and handle accordingly
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        // No files uploaded, but we might have existing photos
        req.body.imageGroups = [];
        return next();
      }

      let files: ProcessedFile[] = [];
      
      // Explicitly type req.files to help TypeScript understand the structure
      const uploadedFiles = req.files as 
        | Express.Multer.File[] 
        | { [fieldname: string]: Express.Multer.File[] | Express.Multer.File };
      
      if (Array.isArray(uploadedFiles)) {
        files = uploadedFiles.filter((file: Express.Multer.File | undefined): file is ProcessedFile => 
          file !== undefined && file !== null
        ) as ProcessedFile[];
      } else if (uploadedFiles[fieldname]) {
        const fieldFiles = uploadedFiles[fieldname];
        if (Array.isArray(fieldFiles)) {
          files = fieldFiles.filter((file: Express.Multer.File | undefined): file is ProcessedFile => 
            file !== undefined && file !== null
          ) as ProcessedFile[];
        } else {
          files = [fieldFiles as ProcessedFile];
        }
      } else {
        // No files for this specific fieldname
        req.body.imageGroups = [];
        return next();
      }

      // If we reach here, we have files to process
      const uploadDir = path.join(
        "uploads",
        fieldname === "avatar" ? "avatar" : 
        fieldname === "images" ? "images" : "others"
      );

      // Use async directory creation
      try {
        await fs.promises.access(uploadDir);
      } catch {
        await fs.promises.mkdir(uploadDir, { recursive: true });
      }

      const processedImageGroups: {
        [id: string]: {
          id: string,
          images: { [size: number]: string }
        }
      } = {};

      const sizesForFirstImage = [320, 640, 1200];
      const sizesForOtherImages = [640, 1200];

      // Pre-load watermark buffers
      const watermarkPath1 = path.resolve(__dirname, "..", 'assets', 'watermarks', 'logo640.png');
      const watermarkPath2 = path.resolve(__dirname, "..", 'assets', 'watermarks', 'logo1200.png');
      
      const [watermarkBuffer1, watermarkBuffer2] = await Promise.all([
        fs.promises.readFile(watermarkPath1),
        fs.promises.readFile(watermarkPath2)
      ]);

      for (const [index, file] of files.entries()) {
        // Type guard to ensure file is defined
        if (!file) continue;

        if (!file.processed) {
          file.processed = { path: {} };
        }

        const dateValue = String(Date.now());
        const uniqueIdPart = path.parse(file.originalname).name; // Safer filename handling
        const uniqueId = `${dateValue}_${uniqueIdPart}`;

        if (!processedImageGroups[uniqueId]) {
          processedImageGroups[uniqueId] = { id: uniqueId, images: {} };
        }

        // Use different sizes depending on index:
        const sizes = (index === 0) ? sizesForFirstImage : sizesForOtherImages;

        for (const size of sizes) {
          const filename = `Grimegh_${dateValue}_${size}_${file.originalname}`;
          const outputPath = path.join(uploadDir, filename).replace(/\\/g, '/');

          if (file.size < 30 * 1024) {
            await fs.promises.writeFile(outputPath, file.buffer);
          } else {
            if (size === 320) {
              await sharp(file.buffer)
                .rotate()
                .resize(size, size, { fit: "inside", withoutEnlargement: true })
                .webp({ quality: 48, effort: 4, smartSubsample: true })
                .withMetadata({ orientation: 1 })
                .toFile(outputPath);
            } else if (size === 640) {
              await sharp(file.buffer)
                .rotate()
                .resize(size, size, { fit: "inside", withoutEnlargement: true })
                .composite([
                  {
                    input: watermarkBuffer1,
                    gravity: "southeast",
                    blend: "over",
                  },
                ])
                .webp({ quality: 48, effort: 4, smartSubsample: true })
                .withMetadata({ orientation: 1 })
                .toFile(outputPath);
            } else {
              await sharp(file.buffer)
                .rotate()
                .resize(size, size, { fit: "inside", withoutEnlargement: true })
                .composite([
                  {
                    input: watermarkBuffer2,
                    gravity: "southeast",
                    blend: "over",
                  },
                ])
                .webp({ quality: 48, effort: 4, smartSubsample: true })
                .withMetadata({ orientation: 1 })
                .toFile(outputPath);
            }
          }

          const urlPath = `/uploads/${fieldname === "avatar" ? "avatar" : fieldname === "images" ? "images" : "others"}/${filename}`;

          processedImageGroups[uniqueId].images[size] = urlPath;
          file.processed.path[size] = urlPath;
        }
      }

      req.body.imageGroups = Object.values(processedImageGroups);
      next();
    } catch (error) {
      // Clean up any partially processed files
      if (req.files) {
        const filesArray: ProcessedFile[] = [];
        const uploadedFiles = req.files as 
          | Express.Multer.File[] 
          | { [fieldname: string]: Express.Multer.File[] | Express.Multer.File };
        
        if (Array.isArray(uploadedFiles)) {
          const filteredFiles = uploadedFiles.filter((file: Express.Multer.File | undefined): file is ProcessedFile => 
            file !== undefined && file !== null
          ) as ProcessedFile[];
          filesArray.push(...filteredFiles);
        } else {
          const fieldFiles = uploadedFiles[fieldname];
          if (fieldFiles) {
            if (Array.isArray(fieldFiles)) {
              const filteredFiles = fieldFiles.filter((file: Express.Multer.File | undefined): file is ProcessedFile => 
                file !== undefined && file !== null
              ) as ProcessedFile[];
              filesArray.push(...filteredFiles);
            } else {
              filesArray.push(fieldFiles as ProcessedFile);
            }
          }
        }

        for (const file of filesArray) {
          if (!file) continue;
          
          if (file.processed?.path) {
            for (const size in file.processed.path) {
              const filePath = file.processed.path[Number(size)];
              if (filePath) {
                try {
                  await fs.promises.unlink(filePath);
                } catch (unlinkError) {
                  console.error("Failed to delete file:", filePath, unlinkError);
                }
              }
            }
          }
        }
      }
      next(error);
    }
  };
};