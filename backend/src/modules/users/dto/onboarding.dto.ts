import { IsEmail, IsEnum, IsOptional, IsString, IsArray, IsBoolean, MaxLength } from 'class-validator';
import { UserGoal, UserInterest } from '../../../entities/preference.entity';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsEnum(UserGoal)
  goal?: UserGoal;

  @IsOptional()
  @IsArray()
  @IsEnum(UserInterest, { each: true })
  interests?: UserInterest[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}
