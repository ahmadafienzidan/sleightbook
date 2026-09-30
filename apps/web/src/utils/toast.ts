import { toast } from "sonner";

interface IToastOptions {
  title: string;
  description?: string;
}

export const Toast = {
  SuccessToast: ({ title, description }: IToastOptions) => toast.success(title, { description }),
  ErrorToast: ({ title, description }: IToastOptions) => toast.error(title, { description }),
  InfoToast: ({ title, description }: IToastOptions) => toast.info(title, { description }),
  WarningToast: ({ title, description }: IToastOptions) => toast.warning(title, { description }),
};
