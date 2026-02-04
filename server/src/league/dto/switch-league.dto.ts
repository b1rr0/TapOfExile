import { IsUUID } from 'class-validator';

export class SwitchLeagueDto {
  @IsUUID()
  leagueId: string;
}
