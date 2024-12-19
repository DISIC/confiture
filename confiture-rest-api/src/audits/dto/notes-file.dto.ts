import { FileDisplay } from "@prisma/client";
import { IsIn, IsOptional, IsString } from "class-validator";

export class NotesFileDto {
  @IsOptional()
  @IsString()
  @IsIn(Object.values(FileDisplay))
  display?: FileDisplay;
}
