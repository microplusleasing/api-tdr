import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const allowedOrigins = [
    'http://localhost:4200',
    'https://uat-tdr.microplusleasing.com',
  ];

  app.enableCors({
    origin: allowedOrigins,
  });

  const config = new DocumentBuilder()
    .setTitle('TDR API')
    .setDescription('TDR API documentation')
    .setVersion('1.0')
    .addTag('Master Data')
    .addTag('Dynamic Form')
    .addTag('App')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('swagger', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
