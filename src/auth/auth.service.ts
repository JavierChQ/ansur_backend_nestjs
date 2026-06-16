import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Repository, In } from 'typeorm';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { compare } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Rol } from 'src/roles/rol.entity';
import { AUTH_ERROR_CODES } from '../common/constants/auth-error-codes.constants';

@Injectable()
export class AuthService {

    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        @InjectRepository(Rol) private rolesRepository: Repository<Rol>,
        private jwtService: JwtService,
    ){}

    async register(user: RegisterAuthDto){

        const { email, phone } = user;
        const emailExist = await this.usersRepository.findOneBy({ email: email })

        if (emailExist) {
            // 409 CONFLICT
            throw new HttpException('El email ya esta registrado', HttpStatus.CONFLICT);
        }

        const phoneExist = await this.usersRepository.findOneBy({phone: phone});

        if (phoneExist) {
            throw new HttpException('El telefono ya esta registrado', HttpStatus.CONFLICT)
        }


        const newUser = this.usersRepository.create(user);
        let rolesIds = [];
        
        if (user.rolesIds !== undefined && user.rolesIds !== null) { // DATA
            rolesIds = user.rolesIds;
        }
        else {
            rolesIds.push('CLIENT')
        }
        const roles = await this.rolesRepository.findBy({id: In(rolesIds)});
        newUser.roles = roles;

        const userSaved = await this.usersRepository.save(newUser);
        const rolesString = userSaved.roles.map(rol => rol.id);

        const payload = {
            id: userSaved.id,
            name: userSaved.name,
            roles: rolesString,
            token_version: userSaved.token_version ?? 0,
        };
        const token = this.jwtService.sign(payload);
        const data = {
            user: userSaved,
            token: 'Bearer ' + token
        }

        delete data.user.password;

        return data;
    }

    async login(loginData: LoginAuthDto) {

        const { email, password } = loginData;
        const userFound = await this.usersRepository.findOne({
           where: {email: email},
           relations: ['roles']
        })
        if (!userFound) {
            throw new HttpException('El email no existe', HttpStatus.NOT_FOUND);
        }

        if (userFound.password_not_set) {
            throw new HttpException(
                {
                    statusCode: HttpStatus.FORBIDDEN,
                    code: AUTH_ERROR_CODES.PASSWORD_NOT_SET,
                    message:
                        'Tu cuenta aún no tiene contraseña. Revisa tu correo para activarla o contacta soporte.',
                },
                HttpStatus.FORBIDDEN,
            );
        }
        
        const isPasswordValid = await compare(password, userFound.password);
        if (!isPasswordValid) {

            // 403 FORBITTEN access denied
            throw new HttpException('La contraseña es incorrecta', HttpStatus.FORBIDDEN);
        }

        const rolesIds = userFound.roles.map(rol => rol.id);

        const payload = {
            id: userFound.id,
            name: userFound.name,
            roles: rolesIds,
            token_version: userFound.token_version ?? 0,
        };
        const token = this.jwtService.sign(payload);
        const data = {
            user: userFound,
            token: 'Bearer ' + token
        }

        delete data.user.password;

        return data;
    }

    async getEmailStatus(email: string) {
        const user = await this.usersRepository.findOneBy({ email });

        if (!user) {
            return {
                exists: false,
                requires_login: false,
            };
        }

        return {
            exists: true,
            requires_login: true,
            password_not_set: user.password_not_set,
        };
    }

}


