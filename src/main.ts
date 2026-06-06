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

  const config = new DocumentBuilder()
  .setTitle('Ansur backend')
  .setDescription(
    'API del e-commerce Ansur.\n\n' +
    '## Flujo de compra\n' +
    '1. **GET /products** — catálogo con `in_stock` (disponible/agotado)\n' +
    '2. **POST /cart/items** — añadir al carrito (valida stock, no reserva)\n' +
    '3. **POST /orders/checkout** — crea orden `PENDIENTE_PAGO` y reserva stock (15 min)\n' +
    '4. **POST /mercadopago/payments** — paga con `order_id` del checkout\n\n' +
    '## Panel admin (rol ADMIN)\n' +
    '- **GET /admin/inventory** — inventario y alertas\n' +
    '- **POST /admin/inventory/:id/restock** — ingreso de mercadería\n' +
    '- **GET /admin/dashboard/stock-summary** — KPIs de stock\n\n' +
    'Autenticación: `Authorization: Bearer <token>` obtenido en POST /auth/login',
  )
  .setVersion('1.1')
  .addBearerAuth(
    { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
    'JWT',
  )
  .addTag('products', 'Catálogo público')
  .addTag('cart', 'Carrito del cliente (1 por usuario, TTL 7 días)')
  .addTag('orders', 'Órdenes y checkout')
  .addTag('mercadopago', 'Pagos con Mercado Pago')
  .addTag('admin-inventory', 'Gestión de inventario (solo ADMIN)')
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
