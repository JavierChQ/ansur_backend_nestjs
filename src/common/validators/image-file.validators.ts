import { FileTypeValidator, MaxFileSizeValidator } from '@nestjs/common';

export const IMAGE_MIME_TYPE_PATTERN = /^image\/(png|jpe?g)$/i;

export const imageFileValidators = [
    new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }),
    new FileTypeValidator({
        fileType: IMAGE_MIME_TYPE_PATTERN,
        // CloudinaryStorage no conserva file.buffer; sin esto la validación falla siempre.
        skipMagicNumbersValidation: true,
    }),
];
