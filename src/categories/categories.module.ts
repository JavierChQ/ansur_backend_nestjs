import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Product } from '../products/product.entity';
import { JwtStrategy } from '../auth/jwt/jwt.strategy';


@Module({
  imports: [ TypeOrmModule.forFeature([Category, Product]) ],
  providers: [CategoriesService, JwtStrategy],
  controllers: [CategoriesController]
})
export class CategoriesModule {}
