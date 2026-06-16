import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Product } from '../products/product.entity';
import { JwtAuthModule } from '../auth/jwt/jwt-auth.module';


@Module({
  imports: [ TypeOrmModule.forFeature([Category, Product]), JwtAuthModule ],
  providers: [CategoriesService],
  controllers: [CategoriesController]
})
export class CategoriesModule {}
