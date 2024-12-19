import { Type } from "class-transformer";
import { IsInt, IsNumber, IsPositive, Max, Min } from "class-validator";
import { IsRgaaCriterium } from "./update-results.dto";
import { FileDisplay } from "@prisma/client";

/*
The `@Type(() => Number)` decorator is required to correctly parse strings into numbers
*/

export class UploadImageDto {
  /**
   * @example 123
   */
  @Type(() => Number)
  @IsNumber()
  pageId: number;

  /**
   * @example 3
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(13)
  topic: number;

  /**
   * @example 2
   */
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsRgaaCriterium({
    message:
      "topic and criterium numbers must be a valid RGAA criterium combination"
  })
  criterium: number;

  display: FileDisplay;
}
