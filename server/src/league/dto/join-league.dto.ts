import { IsUUID } from 'class-validator';

export class JoinLeagueDto {
  @IsUUID()
  leagueId: string;
}
