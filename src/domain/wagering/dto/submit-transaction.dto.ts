import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

import { WagerTransactionKind } from '../wager-transaction.enums';

class TransactionMoneyDto {
  @IsString()
  @Matches(/^(0|[1-9]\d*)\.\d{2}$/)
  amount!: string;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency!: string;
}

export class SubmitTransactionDto {
  @IsString()
  @MaxLength(100)
  providerId!: string;

  @IsString()
  @MaxLength(255)
  externalTransactionId!: string;

  @IsUUID()
  playerId!: string;

  @IsUUID()
  walletId!: string;

  @IsString()
  @MaxLength(255)
  roundId!: string;

  @IsString()
  @MaxLength(255)
  gameId!: string;

  @IsEnum(WagerTransactionKind)
  kind!: WagerTransactionKind;

  @ValidateNested()
  @Type(() => TransactionMoneyDto)
  money!: TransactionMoneyDto;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  referenceExternalTransactionId?: string;
}