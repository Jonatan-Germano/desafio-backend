import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { SubmitTransactionDto } from '../../domain/wagering/dto/submit-transaction.dto';
import { ProcessWagerTransactionService } from './process-wager-transaction.service';

@Controller('wager-transactions')
export class WagerTransactionsController {
  constructor(
    private readonly processTransaction: ProcessWagerTransactionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async submit(
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: SubmitTransactionDto,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException(
        'IDEMPOTENCY_KEY_REQUIRED',
      );
    }

    return this.processTransaction.execute(
      dto,
      idempotencyKey.trim(),
    );
  }
}