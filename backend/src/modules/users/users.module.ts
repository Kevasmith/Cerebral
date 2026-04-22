import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';
import { Preference } from '../../entities/preference.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Preference])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
