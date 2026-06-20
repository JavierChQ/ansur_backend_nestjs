import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { compare } from 'bcrypt';
import { Rol } from 'src/roles/rol.entity';
import { AUTH_ERROR_CODES } from '../common/constants/auth-error-codes.constants';
import { AuthTokenService } from './auth-token.service';
import { AppRole } from './jwt/app-role';
import { RoleAssignmentService } from '../permissions/role-assignment.service';

@Injectable()
export class AuthService {

    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        @InjectRepository(Rol) private rolesRepository: Repository<Rol>,
        private readonly authTokenService: AuthTokenService,
        private readonly roleAssignmentService: RoleAssignmentService,
    ){}

    async register(user: RegisterAuthDto){
        const { email, phone } = user;
        const emailExist = await this.usersRepository.findOneBy({ email: email })

        if (emailExist) {
            throw new HttpException('El email ya esta registrado', HttpStatus.CONFLICT);
        }

        const phoneExist = await this.usersRepository.findOneBy({phone: phone});

        if (phoneExist) {
            throw new HttpException('El telefono ya esta registrado', HttpStatus.CONFLICT)
        }

        const clientRole = await this.rolesRepository.findOneBy({ id: AppRole.CLIENT });

        if (!clientRole) {
            throw new HttpException('Rol CLIENT no configurado', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const newUser = this.usersRepository.create(user);
        newUser.roles = [clientRole];

        const userSaved = await this.usersRepository.save(newUser);
        return this.authTokenService.buildSessionResponse(userSaved);
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
            throw new HttpException('La contraseña es incorrecta', HttpStatus.FORBIDDEN);
        }

        this.roleAssignmentService.getSingleRoleId(userFound);
        return this.authTokenService.buildSessionResponse(userFound);
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

