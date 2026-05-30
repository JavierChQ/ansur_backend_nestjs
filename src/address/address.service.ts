import { Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Address } from './address.entity';
import { Repository } from 'typeorm';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {

    constructor(@InjectRepository(Address) private addressRepository: Repository<Address> ) {}

    create(address: CreateAddressDto) {
        const newAddress = this.addressRepository.create(address);
        return this.addressRepository.save(newAddress);
    }

    findAll() {
        return this.addressRepository.find()
    }
    
    findByUser(id_user: number) {
        return this.addressRepository.findBy({ id_user: id_user })
    }

    async update(id: number, address: UpdateAddressDto) {
        const addressFound = await this.addressRepository.findOneBy({ id: id });
        if (!addressFound) {
            throw new HttpException('Direccion no encontrada', HttpStatus.NOT_FOUND);
        }
        const updatedAddress = Object.assign(addressFound, address);
        return this.addressRepository.save(updatedAddress);
    }
    
    async delete(id: number) {
        const addressFound = await this.addressRepository.findOneBy({ id: id });
        if (!addressFound) {
            throw new HttpException('Direccion no encontrada', HttpStatus.NOT_FOUND);
        }
        return this.addressRepository.delete(id);
    }

}
