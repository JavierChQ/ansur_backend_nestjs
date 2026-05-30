import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateAddressDto {

    @IsNotEmpty()
    @IsString()
    address: string;
    
    @IsNotEmpty()
    @IsString()
    district: string;

    @IsNotEmpty()
    id_user: number

}