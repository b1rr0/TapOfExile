import {
  IsOptional,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BrowseListingsDto {
  @ApiPropertyOptional({ description: 'Filter by item type' })
  @IsOptional()
  @IsString()
  @IsIn(['potion', 'map_key', 'boss_key', 'equipment'])
  itemType?: string;

  @ApiPropertyOptional({ description: 'Filter by item quality' })
  @IsOptional()
  @IsString()
  @IsIn(['common', 'rare', 'epic', 'legendary'])
  quality?: string;

  @ApiPropertyOptional({ description: 'Filter by equipment subtype (slot)' })
  @IsOptional()
  @IsString()
  itemSubtype?: string;

  @ApiPropertyOptional({ description: 'Search by item name (substring)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Sort mode', default: 'newest' })
  @IsOptional()
  @IsString()
  @IsIn(['price_asc', 'price_desc', 'newest', 'quality'])
  sort?: string;

  @ApiPropertyOptional({ description: 'Pagination offset', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  offset?: number;

  @ApiPropertyOptional({ description: 'Pagination limit', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'League ID filter' })
  @IsOptional()
  @IsString()
  leagueId?: string;
}
