import { IsEnum, IsOptional, IsString, IsArray, IsBoolean } from 'class-validator';
import { UserGoal, UserInterest } from '../../../entities/preference.entity';

export class RegisterDto {
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
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
  location?: string;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}
