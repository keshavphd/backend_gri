import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;  
      files?: Express.Multer.File[];
      file?: Express.Multer.File;
    }
  }
}

export {}