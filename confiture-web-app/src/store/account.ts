import jwtDecode from "jwt-decode";
import ky from "ky";
import { defineStore } from "pinia";

import { AuthenticationJwtPayload } from "../types";
import {
  AccountDeletionResponse,
  UpdateProfileRequestData
} from "../types/account";

const AUTH_TOKEN_STORAGE_KEY = "confiture:authToken";

interface AccountStoreState {
  authToken: null | string;
  accountDeletionFeedbackToken: null | string;
}

export const useAccountStore = defineStore("account", {
  state: (): AccountStoreState => {
    let authToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? null;

    if (authToken) {
      try {
        const payload = jwtDecode(authToken) as AuthenticationJwtPayload;

        const isTokenExpired = payload.exp * 1000 < Date.now();
        if (isTokenExpired) {
          throw "tokenIsExpired";
        }
      } catch {
        authToken = null;
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
    }

    return {
      authToken: authToken,
      accountDeletionFeedbackToken: null
    };
  },

  getters: {
    account: (state) => {
      if (!state.authToken) {
        return null;
      }
      const payload = jwtDecode(state.authToken) as AuthenticationJwtPayload;
      return {
        uid: payload.sub,
        email: payload.email,
        name: payload.name,
        orgName: payload.org
      };
    }
  },

  actions: {
    async createAccount(username: string, password: string) {
      await ky.post("/api/auth/signup", {
        json: {
          username,
          password
        }
      });
    },

    async resendVerificationEmail(username: string) {
      await ky.post("/api/auth/resend-verification-email", {
        json: {
          username
        }
      });
    },

    async login(username: string, password: string) {
      const authToken = await ky
        .post("/api/auth/signin", {
          json: {
            username,
            password
          }
        })
        .text();

      this.authToken = authToken;
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
    },

    async refreshToken() {
      const authToken = await ky
        .post("/api/auth/refresh", {
          headers: { Authorization: `Bearer ${this.$state.authToken}` }
        })
        .text();

      this.authToken = authToken;
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
    },

    logout() {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      this.$reset();
    },

    async verifyAccountCreation(verificationToken: string) {
      await ky.post("/api/auth/verify", {
        json: {
          token: verificationToken
        }
      });
    },

    waitForVerification(username: string, signal: AbortSignal) {
      const CHECK_INTERVAL = 5000;
      const url = `/api/auth/verified?username=${encodeURIComponent(username)}`;

      return new Promise<void>((resolve, reject) => {
        let isAborted = false;
        let timerId: undefined | ReturnType<typeof setTimeout> = undefined;

        const onAbort = () => {
          isAborted = true;
          clearTimeout(timerId);
          reject();
        };

        signal.addEventListener("abort", onAbort, { once: true });

        const checkIsVerified = async () => {
          const isAccountVerified = await ky.get(url).json();

          if (!isAccountVerified && !isAborted) {
            timerId = setTimeout(checkIsVerified, CHECK_INTERVAL);
          } else {
            signal.removeEventListener("abort", onAbort);
            resolve();
          }
        };

        timerId = setTimeout(checkIsVerified, CHECK_INTERVAL);
      });
    },

    async updateProfile(data: UpdateProfileRequestData) {
      await ky
        .patch(`/api/profile`, {
          json: data,
          headers: { Authorization: `Bearer ${this.$state.authToken}` }
        })
        .json();

      await this.refreshToken();
    },

    async deleteAccount(password: string) {
      const response = (await ky
        .delete("/api/auth/account", {
          json: {
            password
          },
          headers: { Authorization: `Bearer ${this.authToken}` }
        })
        .json()) as AccountDeletionResponse;

      this.logout();
      this.accountDeletionFeedbackToken = response.feedbackToken;
    },

    async sendAccountDeletionFeedback(feedback: string) {
      await ky.post("/api/feedback/account-deleted", {
        json: {
          feedback,
          feedbackToken: this.accountDeletionFeedbackToken
        }
      });
    },

    async updateEmail(newEmail: string, password: string) {
      await ky.put("/api/auth/account/email", {
        json: {
          newEmail,
          password
        },
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
    },

    async resendEmailUpdateVerificationEmail() {
      await ky.post(
        "/api/auth/account/resend-email-update-verification-email",
        { headers: { Authorization: `Bearer ${this.authToken}` } }
      );
    },

    async cancelEmailUpdate() {
      await ky.post("/api/auth/account/cancel-email-update", {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
    },

    async verifyEmailUpdate(verificationToken: string) {
      await ky.post("/api/auth/account/verify-email-update", {
        json: {
          token: verificationToken
        }
      });
    },

    async updatePassword(oldPassword: string, newPassword: string) {
      await ky.put("/api/auth/update-password", {
        json: { oldPassword, newPassword },
        headers: { Authorization: `Bearer ${this.$state.authToken}` }
      });
    },

    waitForEmailUpdateVerification(newEmail: string, signal: AbortSignal) {
      const CHECK_INTERVAL = 5000;
      const url = `/api/auth/account/verified-email-update?email=${encodeURIComponent(
        newEmail
      )}`;

      return new Promise<void>((resolve, reject) => {
        let isAborted = false;
        let timerId: undefined | ReturnType<typeof setTimeout> = undefined;

        const onAbort = () => {
          isAborted = true;
          clearTimeout(timerId);
          reject();
        };

        signal.addEventListener("abort", onAbort, { once: true });

        const checkIsVerified = async () => {
          const isAccountVerified = await ky
            .get(url, {
              headers: { Authorization: `Bearer ${this.authToken}` }
            })
            .json();

          if (!isAccountVerified && !isAborted) {
            timerId = setTimeout(checkIsVerified, CHECK_INTERVAL);
          } else {
            signal.removeEventListener("abort", onAbort);
            resolve();
          }
        };

        timerId = setTimeout(checkIsVerified, CHECK_INTERVAL);
      });
    },

    async requestPasswordReset(email: string) {
      await ky.post("/api/auth/account/request-password-reset", {
        json: { email }
      });
    },

    async resetPassword(newPassword: string, verificationToken: string) {
      await ky.post("/api/auth/account/reset-password", {
        json: { newPassword, token: verificationToken }
      });
    }
  }
});
