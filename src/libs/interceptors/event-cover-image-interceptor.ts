import { FileInterceptor } from '@nestjs/platform-express';
import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Request } from 'express';

// Create a function that returns the configured FileInterceptor
export function ImageUploadInterceptor(fieldName: string) {
  const options: MulterOptions = {
    limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 2MB
    fileFilter: (req: Request, file: Express.Multer.File, callback) => {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return callback(
          new BadRequestException(
            'Invalid file type. Only JPEG, JPG, and PNG are allowed!',
          ),
          false,
        );
      }
      callback(null, true); // Accept the file if it's valid
    },
  };

  // Return the configured FileInterceptor
  return FileInterceptor(fieldName, options);
}
