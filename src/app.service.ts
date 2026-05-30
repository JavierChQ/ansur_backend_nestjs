import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  getHello(): string {
    return 'ANSUR PERÚ -->  Agrega "/docs" al final de la url para ver la documnetacion de la API';
  }
}
