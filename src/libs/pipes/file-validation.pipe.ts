import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File, metadata: ArgumentMetadata) {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!file) {
      //this should return undefined
      return file;
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    if (file.size > 2 * 1024 * 1024) {
      // 2MB
      throw new BadRequestException('File size exceeds 2MB');
    }

    return file;
  }
}
