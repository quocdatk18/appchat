import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Req,
  BadRequestException,
  UseFilters,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Request } from 'express';
import { mkdirSync, existsSync } from 'fs';
import { MulterExceptionFilter } from './multer-exception.filter';

@UseFilters(MulterExceptionFilter)
@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: Request, file, cb) => {
          // Lấy loại upload từ body hoặc query, mặc định là 'message'
          const type = req.body.type || req.query.type || 'message';
          // Lấy ngày hiện tại
          const date = new Date();
          const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
          // Tạo đường dẫn thư mục
          const uploadPath = `./uploads/${type}/${dateStr}`;
          // Tạo thư mục nếu chưa có
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Chỉ cho phép ảnh, video, word, excel, powerpoint, zip, txt
        const allowed = [
          'jpg',
          'jpeg',
          'png',
          'gif',
          'webp',
          'mp4',
          'webm',
          'doc',
          'docx',
          'xls',
          'xlsx',
          'ppt',
          'pptx',
          'zip',
          'txt',
        ];
        const ext = (file.originalname.split('.').pop() || '').toLowerCase();
        const mime = file.mimetype;
        // MIME type trên các trang như MDN, IANA, Wikipedia hoặc Google với từ khóa "mime type for [đuôi file]".
        if (
          allowed.includes(ext) ||
          mime.startsWith('image/') ||
          mime.startsWith('video/') ||
          mime === 'application/msword' ||
          mime ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          mime === 'application/vnd.ms-excel' ||
          mime ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          mime === 'application/vnd.ms-powerpoint' ||
          mime ===
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
          mime === 'application/zip' ||
          mime === 'text/plain'
        ) {
          cb(null, true);
        } else {
          cb(new Error('File type not allowed!'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 10MB
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('Không nhận được file upload');
      }
      // Loại upload (message/avatar) để xác định thư mục
      const uploadType = req.body.type || req.query.type || 'message';
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      const host = req.get('host');
      const protocol = req.protocol;
      const url = `${protocol}://${host}/uploads/${uploadType}/${dateStr}/${file.filename}`;
      return { url, mimetype: file.mimetype, originalName: file.originalname };
    } catch (err) {
      throw new BadRequestException(err.message || 'Upload failed');
    }
  }
}
