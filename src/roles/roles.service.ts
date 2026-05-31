import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Rol } from './rol.entity';
import { Repository } from 'typeorm';
import { CreateRolDto } from './dto/create-rol.dto';

@Injectable()
export class RolesService {

    constructor(@InjectRepository(Rol) private rolesRepository: Repository<Rol>) {}

    create(rol: CreateRolDto) {
        const newRol = this.rolesRepository.create(rol);
        return this.rolesRepository.save(newRol);
    }

    /**
     * Inserta los roles por defecto en la tabla `roles`.
     * Solo crea los registros si no existen todavía.
     */
    async seedDefaultRoles() {
        const defaultRoles: CreateRolDto[] = [
            {
                id: 'SUPER_ADMIN',
                name: 'Super Administrador',
                image: 'https://res.cloudinary.com/dcnoa5sdu/image/upload/v1780119704/super_admin_wewn9z.png',
                route: 'super_admin/home',
            },
            {
                id: 'ADMIN',
                name: 'Administrador',
                image: 'https://res.cloudinary.com/dcnoa5sdu/image/upload/v1780120050/admin_v5qhcg.jpg',
                route: 'admin/home',
            },
            {
                id: 'CLIENT',
                name: 'Cliente',
                image: 'https://res.cloudinary.com/dcnoa5sdu/image/upload/v1780120321/client_t1rklr.jpg',
                route: 'client/home',
            },
        ];

        for (const role of defaultRoles) {
            // Comprueba si el rol ya existe para evitar duplicados.
            const existing = await this.rolesRepository.findOneBy({ id: role.id });
            if (!existing) {
                const newRol = this.rolesRepository.create(role);
                await this.rolesRepository.save(newRol);
            }
        }
    }

}
