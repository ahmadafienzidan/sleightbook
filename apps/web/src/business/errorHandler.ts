import { ApiError } from "../api/apiError";
import { i18n } from "../i18n/i18n";
import { Toast } from "../utils/toast";

export const handleError = (error: unknown): string => {
  let description: string;
  if (error instanceof ApiError && i18n.exists(`errors.codes.${error.code}`)) {
    description = i18n.t(`errors.codes.${error.code}`);
  } else {
    description = i18n.t("errors.generic");
  }
  Toast.ErrorToast({ title: i18n.t("errors.title"), description });
  return description;
};
