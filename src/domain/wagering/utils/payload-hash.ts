import { createHash } from 'node:crypto';
import { SubmitTransactionDto } from '../dto/submit-transaction.dto';

export function calculatePayloadHash(
  dto: SubmitTransactionDto,
): string {
  const canonicalPayload = JSON.stringify({
    providerId: dto.providerId,
    externalTransactionId: dto.externalTransactionId,
    playerId: dto.playerId,
    walletId: dto.walletId,
    roundId: dto.roundId,
    gameId: dto.gameId,
    kind: dto.kind,
    money: {
      amount: dto.money.amount,
      currency: dto.money.currency,
    },
    referenceExternalTransactionId:
      dto.referenceExternalTransactionId ?? null,
  });

  return createHash('sha256')
    .update(canonicalPayload, 'utf8')
    .digest('hex');
}