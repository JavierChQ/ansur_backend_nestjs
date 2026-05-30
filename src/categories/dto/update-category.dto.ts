import { IsNotEmpty, IsString } from "class-validator";

export class UpdateCategoryDto {

    
    name?: string;
    description?: string;
    image?: string;

}