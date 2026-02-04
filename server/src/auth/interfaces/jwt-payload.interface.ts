export interface JwtPayload {
  sub: string; // telegramId as string (bigint)
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
