import {
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  MinLength,
} from 'class-validator';

export class CreateSellerRatingDto {
  @IsString()
  sellerId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  comment?: string;
}
