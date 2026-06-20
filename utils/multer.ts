import type { NextFunction, Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import sharp from "sharp";

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/avif"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("File is not of correct image type"));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024,
        files: 30
    }
});

export default upload;

interface ProcessedFile extends Express.Multer.File {
    processed?: {
        path: { [size: number]: string };
    };
}

export const processUpload = (fieldname: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            let files: ProcessedFile[] = [];
            
            // Handle different file field scenarios with explicit typing
            if (req.files) {
                if (Array.isArray(req.files)) {
                    files = req.files.filter((file): file is ProcessedFile => file !== undefined && file !== null);
                } else {
                    const fieldFiles = (req.files as { [fieldname: string]: Express.Multer.File[] | Express.Multer.File })[fieldname];
                    if (fieldFiles) {
                        if (Array.isArray(fieldFiles)) {
                            files = fieldFiles.filter((file): file is ProcessedFile => file !== undefined && file !== null);
                        } else {
                            files = [fieldFiles as ProcessedFile];
                        }
                    }
                }
            }

            if (!files.length) return res.status(400).json({ error: "Please add images" });

            const uploadDir = path.join(
                "uploads",
                fieldname === "avatar" ? "avatar" : fieldname === "images" ? "images" : "others"
            );

            // Use async directory creation
            try {
                await fs.promises.access(uploadDir);
            } catch {
                await fs.promises.mkdir(uploadDir, { recursive: true });
            }

            const processedImageGroups: {
                [id: string]: {
                    id: string;
                    images: { [size: number]: string };
                };
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

            // Process each file
            for (const [index, file] of files.entries()) {
                if (!file) continue;

                if (!file.processed) {
                    file.processed = { path: {} };
                }

                const dateValue = String(Date.now());
                const uniqueIdPart = path.parse(file.originalname).name;
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
            // Cleanup any created files on error
            if (req.files) {
                const filesArray: ProcessedFile[] = [];
                
                if (Array.isArray(req.files)) {
                    // Use type guard filter
                    const filteredFiles = (req.files as Express.Multer.File[]).filter((file): file is ProcessedFile => 
                        file !== undefined && file !== null
                    );
                    filesArray.push(...filteredFiles);
                } else {
                    const fieldFiles = (req.files as { [fieldname: string]: Express.Multer.File[] | Express.Multer.File })[fieldname];
                    if (fieldFiles) {
                        if (Array.isArray(fieldFiles)) {
                            const filteredFiles = fieldFiles.filter((file): file is ProcessedFile => 
                                file !== undefined && file !== null
                            );
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