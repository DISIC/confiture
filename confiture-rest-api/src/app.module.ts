import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { FeedbackModule } from "./feedback/feedback.module";
import { AuditsModule } from "./audits/audits.module";
import { HealthCheckController } from "./health-check.controller";
import { configValidationSchema } from "./config-validation-schema";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./auth/auth.module";
import { ProfileModule } from "./profile/profile.module";
import { UserMiddleware } from "./auth/user.middleware";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: !process.env.GENERATE_TYPES
        ? configValidationSchema
        : undefined
    }),
    FeedbackModule,
    AuditsModule,
    MailModule,
    AuthModule,
    ProfileModule
  ],
  controllers: [HealthCheckController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserMiddleware).forRoutes("*");
  }
}
