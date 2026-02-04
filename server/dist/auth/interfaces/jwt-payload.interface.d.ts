export interface JwtPayload {
    sub: string;
    type: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}
