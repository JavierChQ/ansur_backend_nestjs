import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({forbidUnknownValues: false}));

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

  // await app.listen(parseInt(process.env.PORT) || 3000);
  await app.listen(3000, '192.168.1.29' || 'localhost');
}
bootstrap();
