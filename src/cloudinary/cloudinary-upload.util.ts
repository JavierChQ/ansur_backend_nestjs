import { HttpException, HttpStatus } from '@nestjs/common';

export function getCloudinaryUrlFromFile(file: Express.Multer.File): string {
  const url =
    (file.path?.startsWith('http') ? file.path : undefined) ||
    (file as Express.Multer.File & { secure_url?: string }).secure_url;

  if (!url) {
    throw new HttpException('La imagen no se pudo guardar', HttpStatus.INTERNAL_SERVER_ERROR);
  }

  return url;
}
