import { captureException, Scope } from "@sentry/vue";
import jwtDecode from "jwt-decode";
import { HTTPError, TimeoutError } from "ky";
import { noop } from "lodash-es";
import baseSlugify from "slugify";

import { FileErrorMessage } from "./enums";
import {
  AuditReport,
  AuditStatus,
  AuditType,
  CriterionResultUserImpact,
  CriteriumResultStatus
} from "./types";

const formatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

const abridgedFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

/**
 * Format a string intro a readable date ("17 août 2022")
 * @param {boolean} short - abridged version: "17/08/2022"
 */
export function formatDate(dateString: string, short?: boolean): string {
  return short
    ? abridgedFormatter.format(new Date(dateString))
    : formatter.format(new Date(dateString));
}

const FORMATTED_USER_IMPACT = {
  [CriterionResultUserImpact.MINOR]: "mineur",
  [CriterionResultUserImpact.MAJOR]: "majeur",
  [CriterionResultUserImpact.BLOCKING]: "bloquant"
};

/**
 * Format a criterion result user impact type string into French.
 */
export function formatUserImpact(
  userImpact: CriterionResultUserImpact
): string {
  return FORMATTED_USER_IMPACT[userImpact];
}

const FORMATTED_STATUS = {
  [CriteriumResultStatus.NOT_TESTED]: "Non testé",
  [CriteriumResultStatus.COMPLIANT]: "Conforme",
  [CriteriumResultStatus.NOT_COMPLIANT]: "Non conforme",
  [CriteriumResultStatus.NOT_APPLICABLE]: "Non applicable"
};

/**
 * Format a criterion result status type string into French.
 */
export function formatStatus(status: CriteriumResultStatus): string {
  return FORMATTED_STATUS[status];
}

const CRITERIA_COUNT = {
  [AuditType.FAST]: 25,
  [AuditType.COMPLEMENTARY]: 50,
  [AuditType.FULL]: 106
};

/**
 * Return the number of criteria for a given audit type.
 */
export function getCriteriaCount(auditType: AuditType): number {
  return CRITERIA_COUNT[auditType];
}

/**
 * Return the audit status based on:
 * - the number of results excluding transverse (criteria count * number of pages)
 * - the status of each criteria
 * - the completion of a11y statement
 */
export function getAuditStatus(report: AuditReport): string {
  const transversePageId = report.context.samples[0].id;

  if (
    report.results.filter((r) => r.pageId !== transversePageId).length !==
      getCriteriaCount(report.auditType) *
        (report.context.samples.length - 1) ||
    report?.results
      .filter((r) => r.pageId !== transversePageId)
      .some((r) => r.status === CriteriumResultStatus.NOT_TESTED)
  ) {
    return AuditStatus.IN_PROGRESS;
  }

  if (report.procedureInitiator) {
    return AuditStatus.PUBLISHABLE;
  }

  return AuditStatus.COMPLETED;
}

/**
 * Get a CSS variable value from the root element.
 */
export function getCssVarValue(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName);
}

export function slugify(value: string): string {
  return baseSlugify(value, { strict: true, lower: true });
}

export function formatBytes(bytes: number, decimals = 0) {
  if (!+bytes) return "0 octets";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["octets", "Ko", "Mo", "Go", "To", "Po", "Eo", "Zo", "Yo"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Report an error to Sentry. If the error originates from a network request,
 * the request and response payloads are added to the error context.
 *
 * @param error Error to be captured
 * @param logRequestPayload Should the request payload be added to the error
 *   context. Set to `false` when capturing authentication requests.
 */
export async function captureWithPayloads(
  error: unknown,
  logRequestPayload = true
) {
  const scope = new Scope();

  if (error instanceof HTTPError) {
    const payloads: Record<string, string> = {};

    if (logRequestPayload) {
      await error.request
        .text()
        .then((data) => {
          payloads["Request Raw"] = data;
          try {
            payloads["Request JSON"] = JSON.stringify(
              JSON.parse(data),
              null,
              2
            );
          } catch (e) {
            // noop, we dont do anything if it's not JSON
          }
        })
        .catch(noop);
    }

    await error.response
      .text()
      .then((data) => {
        payloads["Response Raw"] = data;
        try {
          payloads["Response JSON"] = JSON.stringify(JSON.parse(data), null, 2);
        } catch (e) {
          // noop, we dont do anything if it's not JSON
        }
      })
      .catch(noop);

    scope.setContext("Network payloads", payloads);
  }

  captureException(error, scope);
}

export const pluralize = (singular: string, plural: string, count: number) =>
  count === 1 ? singular : plural;

// From https://emailregex.com/
// regexr.com/7lkj4
const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export function validateEmail(s: string): boolean {
  return !!s.match(EMAIL_REGEX);
}

// Trim + lowercase email
export function formatEmail(s: string): string {
  return s.trim().toLocaleLowerCase();
}

// https://regexr.com/819do
export const URL_REGEX = /^https?:\/\/(.*)/;

export function isJwtExpired(jwt: string) {
  const payload = jwtDecode<{ exp?: number }>(jwt);

  if (!payload.exp) {
    return false;
  }

  return Date.now() > payload.exp * 1000;
}

/**
 * Wait for an element matching the given selector to appear in the DOM and
 * return a promise resolving to the element.
 */
export function waitForElement(selector: string): Promise<Element> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);

    if (el) {
      return resolve(el);
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

export function getUploadUrl(key: string): string {
  return `/uploads/${key}`;
}

export async function handleFileUploadError(
  error: Error
): Promise<FileErrorMessage | string> {
  if (error instanceof HTTPError) {
    let errorType: FileErrorMessage;
    if (error.response.status === 413) {
      errorType = FileErrorMessage.UPLOAD_SIZE;
    }

    // Unprocessable Entity
    /* UPLOAD_FORMAT should never happen… */
    if (error.response.status === 422) {
      const body = await error.response.json();

      if (body.message.includes("expected type")) {
        errorType = FileErrorMessage.UPLOAD_FORMAT;
      } else if (body.message.includes("expected size")) {
        errorType = FileErrorMessage.UPLOAD_SIZE;
      } else {
        errorType = FileErrorMessage.UPLOAD_UNKNOWN;
        captureWithPayloads(error);
      }
    } else {
      errorType = FileErrorMessage.UPLOAD_UNKNOWN;
      captureWithPayloads(error);
    }

    return errorType;
  }

  if (error instanceof TimeoutError) {
    return FileErrorMessage.UPLOAD_TIMEOUT;
  }

  console.warn(error);
  return error.message;
}

export async function handleFileDeleteError(
  error: Error
): Promise<FileErrorMessage | string> {
  if (error instanceof HTTPError) {
    return FileErrorMessage.DELETE_UNKNOWN;
  }
  if (error instanceof TimeoutError) {
    return FileErrorMessage.DELETE_TIMEOUT;
  }

  console.warn(error);
  return error.message;
}
