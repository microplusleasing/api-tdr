import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { MasterDataModule } from './database/master-data/master-data.module';

const stage = process.env.STAGE;

if (!stage) {
  throw new Error('STAGE environment variable is required');
}
@Module({
  imports: [
    ConfigModule.forRoot({
      // envFilePath: [`.env.stage.${process.env.STAGE}`]
      isGlobal: true,
      envFilePath: [`env/.env.stage.${stage}`],
    }),
    DatabaseModule,
    MasterDataModule,
    // DynamicFormModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
