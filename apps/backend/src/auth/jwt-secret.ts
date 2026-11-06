/**
 * JWT-секрет из переменных окружения.
 *
 * В production отсутствие JWT_SECRET приводит к немедленной ошибке при старте,
 * чтобы токены никогда не подписывались известным dev-секретом.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  return 'dev-secret-change-in-prod';
}
