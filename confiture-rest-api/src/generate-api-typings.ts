import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { writeFile } from "fs/promises";
import openapiTS, { OpenAPI3 } from "openapi-typescript";
import { resolve } from "path";

import { AppModule } from "./app.module";

async function main() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder().setTitle("Confiture API").build();
  const document = SwaggerModule.createDocument(app, config);

  const ast = await openapiTS(document as OpenAPI3);
  const fileContent = "/* eslint-disable */\n" + ast;
  const resolvedPath = resolve(process.cwd(), "./confiture-api.ts");
  await writeFile(resolvedPath, fileContent, {
    encoding: "utf-8"
  });
  console.log("✅ Typings saved to", resolvedPath);
}

main();
