import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export const Brand = () => {
  const { t } = useTranslation();
  return (
    <Link to="/" className="block rounded-md px-3">
      <span className="text-xl font-bold tracking-tight">
        sleight<span className="text-gold">book</span>
      </span>
      <span className="block text-xs text-subtle">{t("app.tagline")}</span>
    </Link>
  );
};
