import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import { RolesService } from './roles/roles.service';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'https://www.ansur.com.pe',
      'https://ansur.com.pe',
      'https://admin.ansur.com.pe',
      'http://localhost:4200',
    ],
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({forbidUnknownValues: false}));

  // Inicia la semilla de datos para roles predeterminados.
  // Esto asegura que ADMIN y CLIENT existan en la tabla de roles al arrancar.
  const rolesService = app.get(RolesService);
  await rolesService.seedDefaultRoles();

  // Configuración para la documentacion swagger
  const config = new DocumentBuilder()
  .setTitle("Ansur backend")
  .setDescription("Descripcion de las APIs")
  .setVersion("1.0")
  .build();
  // crea el documento swagger
  const document = SwaggerModule.createDocument(app, config);
  // guarda el documento como archivo JSON
  fs.writeFileSync('./swagger-spec.json', JSON.stringify(document));
  // configura la ruta para acceder a la documentacion
  SwaggerModule.setup("docs", app, document);

  await app.listen(parseInt(process.env.PORT) || 3000);
}
bootstrap();
