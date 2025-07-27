import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let errorMessage = 'Upload failed';

    switch (exception.code) {
      case 'LIMIT_FILE_SIZE':
        errorMessage = 'File quá lớn (tối đa 10MB)';
        break;
      case 'LIMIT_FILE_COUNT':
        errorMessage = 'Quá nhiều file';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        errorMessage = 'File không được hỗ trợ';
        break;
      default:
        errorMessage = exception.message || 'Upload failed';
    }

    response.status(400).json({
      statusCode: 400,
      message: errorMessage,
      error: 'Bad Request',
      code: exception.code,
    });
  }
}
