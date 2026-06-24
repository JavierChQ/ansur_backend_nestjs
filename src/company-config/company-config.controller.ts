import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompanyConfigService } from './company-config.service';
import { ContactConfigDto } from './dto/contact-config.dto';

@ApiTags('config')
@Controller('config')
export class CompanyConfigController {
  constructor(private readonly companyConfigService: CompanyConfigService) {}

  @Get('contact')
  @ApiOperation({
    summary: 'Configuración pública de contacto',
    description:
      'Expone WhatsApp, dirección, sitio web y redes sociales para el frontend.',
  })
  @ApiOkResponse({ type: ContactConfigDto })
  getContactConfig(): ContactConfigDto {
    return this.companyConfigService.getContactConfig();
  }
}
